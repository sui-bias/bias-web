/// Bias 유료 구독 - 스트림(정기결제) 방식.
///
/// 사용자가 일정 금액을 스트림 escrow(Subscription)에 예치하면, 시간(Clock)에
/// 비례해 서비스가 vest분을 Treasury로 청구(claim)한다. 사용자는 언제든 취소하고
/// 미사용 잔액을 환불받는다. 코인 타입은 제네릭(T)이라 데모는 SUI, 프로덕션은
/// USDC 등으로 동일 코드 재사용 가능하다.
module bias_subscription::subscription {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::clock::Clock;
    use sui::event;
    // object / transfer / tx_context 는 2024 에디션에서 암묵적으로 import 됨.

    // ── 에러 코드 ──────────────────────────────────────────────
    const ETierInvalid: u64 = 0;
    const ENotOwner: u64 = 1;
    const EBadPayment: u64 = 2;
    const ENotActive: u64 = 3;

    // ── 상수 ──────────────────────────────────────────────────
    const TIER_PLUS: u8 = 1; // 1=Plus 2=Pro 3=Max
    const TIER_MAX: u8 = 3;
    /// rate 정밀도 손실 방지용 고정소수 스케일.
    const RATE_SCALE: u128 = 1_000_000_000;

    // ── 객체 ──────────────────────────────────────────────────
    /// 배포자에게 발급되는 운영 권한.
    public struct AdminCap has key, store { id: UID }

    /// 코인 타입별 수익 금고(공유 객체).
    public struct Treasury<phantom T> has key {
        id: UID,
        funds: Balance<T>,
    }

    /// 유저별 구독 스트림(공유 객체 - 서비스 claim 위해 공유).
    public struct Subscription<phantom T> has key {
        id: UID,
        owner: address,
        tier: u8,
        rate_scaled: u128, // (amount * RATE_SCALE) / duration_ms
        deposited: Balance<T>,
        start_ms: u64,
        last_claim_ms: u64,
        active: bool,
    }

    // ── 이벤트 ────────────────────────────────────────────────
    public struct SubscriptionCreated has copy, drop {
        subscription_id: ID,
        owner: address,
        tier: u8,
        amount: u64,
        start_ms: u64,
    }
    public struct ToppedUp has copy, drop { subscription_id: ID, owner: address, amount: u64 }
    public struct Claimed has copy, drop { subscription_id: ID, amount: u64, at_ms: u64 }
    public struct Cancelled has copy, drop {
        subscription_id: ID,
        owner: address,
        refunded: u64,
        at_ms: u64,
    }
    public struct Expired has copy, drop { subscription_id: ID, owner: address, at_ms: u64 }

    // ── 초기화 ────────────────────────────────────────────────
    fun init(ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
    }

    /// 코인 타입 T 의 Treasury 를 1회 생성/공유. (배포 후 admin 이 호출)
    public entry fun create_treasury<T>(_: &AdminCap, ctx: &mut TxContext) {
        transfer::share_object(Treasury<T> {
            id: object::new(ctx),
            funds: balance::zero<T>(),
        });
    }

    // ── 구독 시작 ─────────────────────────────────────────────
    /// tier 플랜으로 payment 만큼 duration_ms 동안 흐르는 스트림 생성.
    public entry fun subscribe<T>(
        tier: u8,
        payment: Coin<T>,
        duration_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(tier >= TIER_PLUS && tier <= TIER_MAX, ETierInvalid);
        let amount = payment.value();
        assert!(amount > 0 && duration_ms > 0, EBadPayment);

        let now = clock.timestamp_ms();
        let rate = ((amount as u128) * RATE_SCALE) / (duration_ms as u128);
        let owner = ctx.sender();

        let sub = Subscription<T> {
            id: object::new(ctx),
            owner,
            tier,
            rate_scaled: rate,
            deposited: payment.into_balance(),
            start_ms: now,
            last_claim_ms: now,
            active: true,
        };
        event::emit(SubscriptionCreated {
            subscription_id: object::id(&sub),
            owner,
            tier,
            amount,
            start_ms: now,
        });
        transfer::share_object(sub);
    }

    // ── 보충(갱신) ────────────────────────────────────────────
    public entry fun top_up<T>(sub: &mut Subscription<T>, payment: Coin<T>, ctx: &mut TxContext) {
        assert!(ctx.sender() == sub.owner, ENotOwner);
        let amount = payment.value();
        assert!(amount > 0, EBadPayment);
        sub.deposited.join(payment.into_balance());
        sub.active = true;
        event::emit(ToppedUp { subscription_id: object::id(sub), owner: sub.owner, amount });
    }

    // ── 내부: now 까지 vest분을 Treasury 로 정산하고 정산액 반환 ──
    fun settle<T>(sub: &mut Subscription<T>, treasury: &mut Treasury<T>, now: u64): u64 {
        let elapsed = ((now - sub.last_claim_ms) as u128);
        let mut vested = (elapsed * sub.rate_scaled) / RATE_SCALE;
        let avail = (sub.deposited.value() as u128);
        if (vested > avail) { vested = avail; };
        let v = (vested as u64);
        if (v > 0) {
            treasury.funds.join(sub.deposited.split(v));
            sub.last_claim_ms = now;
        };
        v
    }

    // ── 서비스 청구 ───────────────────────────────────────────
    public entry fun claim<T>(
        sub: &mut Subscription<T>,
        treasury: &mut Treasury<T>,
        _: &AdminCap,
        clock: &Clock,
    ) {
        assert!(sub.active, ENotActive);
        let now = clock.timestamp_ms();
        let claimed = settle(sub, treasury, now);
        if (claimed > 0) {
            event::emit(Claimed { subscription_id: object::id(sub), amount: claimed, at_ms: now });
        };
        if (sub.deposited.value() == 0) {
            sub.active = false;
            event::emit(Expired { subscription_id: object::id(sub), owner: sub.owner, at_ms: now });
        };
    }

    // ── 취소 + 환불 ───────────────────────────────────────────
    public entry fun cancel<T>(
        sub: &mut Subscription<T>,
        treasury: &mut Treasury<T>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(ctx.sender() == sub.owner, ENotOwner);
        let now = clock.timestamp_ms();
        settle(sub, treasury, now); // 사용분 먼저 정산
        let remaining = sub.deposited.value();
        if (remaining > 0) {
            transfer::public_transfer(
                coin::from_balance(sub.deposited.split(remaining), ctx),
                sub.owner,
            );
        };
        sub.active = false;
        event::emit(Cancelled {
            subscription_id: object::id(sub),
            owner: sub.owner,
            refunded: remaining,
            at_ms: now,
        });
    }

    // ── 운영: Treasury 출금 ───────────────────────────────────
    public entry fun withdraw<T>(
        treasury: &mut Treasury<T>,
        amount: u64,
        _: &AdminCap,
        ctx: &mut TxContext,
    ) {
        transfer::public_transfer(
            coin::from_balance(treasury.funds.split(amount), ctx),
            ctx.sender(),
        );
    }

    // ── 조회 ──────────────────────────────────────────────────
    public fun deposited_value<T>(sub: &Subscription<T>): u64 { sub.deposited.value() }
    public fun is_active<T>(sub: &Subscription<T>): bool { sub.active }
    public fun tier_of<T>(sub: &Subscription<T>): u8 { sub.tier }
}
