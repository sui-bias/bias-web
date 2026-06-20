/// Bias 유료 구독 - NFT 멤버십 패스 방식.
///
/// 구독권은 `MembershipPass` NFT(`key, store`)로 발급된다. 보유자는 NFT를
/// 그대로 양도하거나 내장 마켓에 등록해 다른 유저에게 판매할 수 있다.
/// plan 검증은 "연결된 지갑이 보유한 미만료 Pass 중 최고 tier"로 한다(온체인 소유 조회).
///
/// 설계 노트:
/// - Pass는 flat mutable 객체다. `tier`/`issued_ms`는 발급 후 바뀌지 않고
///   (tier를 바꾸는 entry는 `upgrade` 뿐), `expires_ms`만 `renew`로 in-place 갱신한다.
///   → 매달 새 NFT가 쌓이지 않고 동일 객체의 만료일만 연장된다.
/// - tier 불변성은 "구조 분리"가 아니라 "변경 entry 미노출"로 보장된다(policy 불변).
/// - 결제 코인은 데모 단순화를 위해 SUI 고정. 프로덕션 USDC 전환 시 Coin 타입만 교체.
module bias_subscription::subscription {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::Clock;
    use sui::event;
    // object / transfer / tx_context 는 2024 에디션에서 암묵적으로 import 됨.

    // ── 에러 코드 ──────────────────────────────────────────────
    const ETierInvalid: u64 = 0;
    const EBadPayment: u64 = 1;
    const ENotSeller: u64 = 2;
    const ENotUpgrade: u64 = 3; // upgrade 대상 tier 가 현재보다 높지 않음

    // ── 상수 ──────────────────────────────────────────────────
    const TIER_PLUS: u8 = 1; // 1=Plus 2=Pro 3=Max
    const TIER_PRO: u8 = 2;
    const TIER_MAX: u8 = 3;

    // ── 객체 ──────────────────────────────────────────────────
    /// 배포자에게 발급되는 운영 권한.
    public struct AdminCap has key, store { id: UID }

    /// tier별 가격·구독기간·1차판매 수익을 보관하는 공유 설정 객체.
    public struct Config has key {
        id: UID,
        plus_price: u64,
        pro_price: u64,
        max_price: u64,
        period_ms: u64,       // 1회 결제로 늘어나는 구독 기간
        revenue: Balance<SUI>, // mint/renew/upgrade 결제 수익
    }

    /// 구독권 NFT. `store` 보유 → 양도/거래 가능.
    /// flat mutable: tier/issued_ms 불변, expires_ms 만 renew 로 갱신.
    public struct MembershipPass has key, store {
        id: UID,
        tier: u8,
        issued_ms: u64,
        expires_ms: u64,
    }

    /// 내장 마켓 판매 등록(공유). Pass 를 에스크로로 래핑해 보관한다.
    /// 등록 중에는 판매자가 Pass 를 보유하지 않으므로 renew/upgrade 가 불가능 →
    /// tier·만료가 freeze 되어 구매자가 본 그대로 거래된다.
    public struct Listing has key {
        id: UID,
        pass: MembershipPass,
        seller: address,
        price: u64,
    }

    // ── 이벤트 ────────────────────────────────────────────────
    public struct Minted has copy, drop {
        pass_id: ID,
        owner: address,
        tier: u8,
        expires_ms: u64,
    }
    public struct Renewed has copy, drop { pass_id: ID, tier: u8, expires_ms: u64 }
    public struct Upgraded has copy, drop {
        old_pass_id: ID,
        new_pass_id: ID,
        owner: address,
        tier: u8,
        expires_ms: u64,
    }
    public struct Listed has copy, drop {
        listing_id: ID,
        pass_id: ID,
        seller: address,
        tier: u8,
        expires_ms: u64,
        price: u64,
    }
    public struct Sold has copy, drop {
        listing_id: ID,
        pass_id: ID,
        seller: address,
        buyer: address,
        price: u64,
    }
    public struct Delisted has copy, drop { listing_id: ID, pass_id: ID, seller: address }

    // ── 초기화 ────────────────────────────────────────────────
    fun init(ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
    }

    /// 가격·기간을 정해 Config 를 1회 생성/공유. (배포 후 admin 이 호출)
    public entry fun create_config(
        _: &AdminCap,
        plus_price: u64,
        pro_price: u64,
        max_price: u64,
        period_ms: u64,
        ctx: &mut TxContext,
    ) {
        transfer::share_object(Config {
            id: object::new(ctx),
            plus_price,
            pro_price,
            max_price,
            period_ms,
            revenue: balance::zero<SUI>(),
        });
    }

    /// admin 이 가격/기간을 수정.
    public entry fun set_params(
        _: &AdminCap,
        config: &mut Config,
        plus_price: u64,
        pro_price: u64,
        max_price: u64,
        period_ms: u64,
    ) {
        config.plus_price = plus_price;
        config.pro_price = pro_price;
        config.max_price = max_price;
        config.period_ms = period_ms;
    }

    // ── 내부 헬퍼 ─────────────────────────────────────────────
    fun price_for_tier(config: &Config, tier: u8): u64 {
        if (tier == TIER_PLUS) { config.plus_price }
        else if (tier == TIER_PRO) { config.pro_price }
        else if (tier == TIER_MAX) { config.max_price }
        else { abort ETierInvalid }
    }

    /// payment 가 price 이상인지 검증하고 전액을 revenue 로 적립.
    fun collect(config: &mut Config, payment: Coin<SUI>, price: u64) {
        assert!(coin::value(&payment) >= price, EBadPayment);
        balance::join(&mut config.revenue, coin::into_balance(payment));
    }

    // ── 1차 구매(발급) ────────────────────────────────────────
    /// tier 플랜 Pass 를 발급. 만료 = now + period_ms.
    public entry fun mint(
        config: &mut Config,
        tier: u8,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(tier >= TIER_PLUS && tier <= TIER_MAX, ETierInvalid);
        let price = price_for_tier(config, tier);
        collect(config, payment, price);

        let now = clock.timestamp_ms();
        let pass = MembershipPass {
            id: object::new(ctx),
            tier,
            issued_ms: now,
            expires_ms: now + config.period_ms,
        };
        event::emit(Minted {
            pass_id: object::id(&pass),
            owner: ctx.sender(),
            tier,
            expires_ms: pass.expires_ms,
        });
        transfer::public_transfer(pass, ctx.sender());
    }

    // ── 갱신(만료 연장) ───────────────────────────────────────
    /// 보유한 Pass 의 expires_ms 를 in-place 연장. 새 NFT 를 만들지 않는다.
    /// 만료 전 갱신 → 남은 기간에 더해짐. 만료 후 갱신 → now 부터 다시 시작.
    /// (owned object 라 서명자=소유자임을 Sui 가 강제 → 별도 owner 체크 불필요)
    public entry fun renew(
        config: &mut Config,
        pass: &mut MembershipPass,
        payment: Coin<SUI>,
        clock: &Clock,
    ) {
        let price = price_for_tier(config, pass.tier);
        collect(config, payment, price);

        let now = clock.timestamp_ms();
        let base = if (pass.expires_ms > now) { pass.expires_ms } else { now };
        pass.expires_ms = base + config.period_ms;
        event::emit(Renewed {
            pass_id: object::id(pass),
            tier: pass.tier,
            expires_ms: pass.expires_ms,
        });
    }

    // ── 업그레이드(tier 상향) ─────────────────────────────────
    /// tier 는 불변이므로 in-place 변경 대신 기존 Pass 를 소각하고 상위 tier
    /// Pass 를 새로 발급한다(남은 만료 그대로 이관). 여전히 NFT 1개 유지.
    public entry fun upgrade(
        config: &mut Config,
        pass: MembershipPass,
        new_tier: u8,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(new_tier > pass.tier && new_tier <= TIER_MAX, ENotUpgrade);
        // 차액만 받는다(현재 tier 가격은 이미 지불됨).
        let diff = price_for_tier(config, new_tier) - price_for_tier(config, pass.tier);
        collect(config, payment, diff);

        let old_pass_id = object::id(&pass);
        let MembershipPass { id, tier: _, issued_ms, expires_ms } = pass;
        id.delete();

        let upgraded = MembershipPass {
            id: object::new(ctx),
            tier: new_tier,
            issued_ms,
            expires_ms,
        };
        event::emit(Upgraded {
            old_pass_id,
            new_pass_id: object::id(&upgraded),
            owner: ctx.sender(),
            tier: new_tier,
            expires_ms,
        });
        transfer::public_transfer(upgraded, ctx.sender());
    }

    // ── 내장 마켓: 판매 등록 ──────────────────────────────────
    public entry fun list_pass(pass: MembershipPass, price: u64, ctx: &mut TxContext) {
        let listing = Listing {
            id: object::new(ctx),
            seller: ctx.sender(),
            price,
            pass,
        };
        event::emit(Listed {
            listing_id: object::id(&listing),
            pass_id: object::id(&listing.pass),
            seller: listing.seller,
            tier: listing.pass.tier,
            expires_ms: listing.pass.expires_ms,
            price,
        });
        transfer::share_object(listing);
    }

    // ── 내장 마켓: 구매 ───────────────────────────────────────
    /// payment(SUI)는 판매자에게, Pass NFT 는 구매자에게 이전.
    public entry fun buy_pass(
        listing: Listing,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let listing_id = object::id(&listing);
        let Listing { id, pass, seller, price } = listing;
        assert!(coin::value(&payment) >= price, EBadPayment);

        let buyer = ctx.sender();
        let pass_id = object::id(&pass);

        transfer::public_transfer(payment, seller);
        transfer::public_transfer(pass, buyer);
        id.delete();

        event::emit(Sold { listing_id, pass_id, seller, buyer, price });
    }

    // ── 내장 마켓: 등록 취소 ──────────────────────────────────
    public entry fun delist(listing: Listing, ctx: &mut TxContext) {
        let listing_id = object::id(&listing);
        let Listing { id, pass, seller, price: _ } = listing;
        assert!(ctx.sender() == seller, ENotSeller);
        let pass_id = object::id(&pass);
        transfer::public_transfer(pass, seller);
        id.delete();
        event::emit(Delisted { listing_id, pass_id, seller });
    }

    // ── 운영: 수익 출금 ───────────────────────────────────────
    public entry fun withdraw(
        _: &AdminCap,
        config: &mut Config,
        amount: u64,
        ctx: &mut TxContext,
    ) {
        transfer::public_transfer(
            coin::from_balance(balance::split(&mut config.revenue, amount), ctx),
            ctx.sender(),
        );
    }

    // ── 조회 ──────────────────────────────────────────────────
    public fun tier_of(pass: &MembershipPass): u8 { pass.tier }
    public fun expires_ms_of(pass: &MembershipPass): u64 { pass.expires_ms }
    public fun issued_ms_of(pass: &MembershipPass): u64 { pass.issued_ms }
    public fun is_valid(pass: &MembershipPass, clock: &Clock): bool {
        clock.timestamp_ms() < pass.expires_ms
    }
}
