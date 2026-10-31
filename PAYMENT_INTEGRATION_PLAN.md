# Scrapi — Payment Integration Plan

> Status: **PLAN ONLY (not started)**
> Last updated: 2026-10-29
> Business model: **reverse payment** — Scrapi pays the CUSTOMER for scrap collected.
> Confirmed gateway direction: **RazorpayX payouts** (customer gets paid via UPI ID or bank transfer).
> Customer payout methods accepted: **UPI ID + Bank account** (user-selected decision).

---

## 1. The core constraint that drives this whole plan

| Product | Direction | Status for us |
|---|---|---|
| Razorpay Payments (existing gateway account) | Collect money FROM customers | We do NOT collect — unusable for our flow |
| **RazorpayX** | **Pay money OUT** (UPI / NEFT / IMPS / RTGS) | **This is what we need** |

Key RazorpayX facts (verified from Razorpay docs, Oct 2026):

- Existing Razorpay users **log into RazorpayX with the same credentials and can use the same API keys** for Payout APIs. RazorpayX is an *activation on top of* our account, not a new account.
- **Payouts stay locked until RazorpayX KYC is submitted AND verified.** Two-step onboarding: account → KYC → payouts unlocked.
- **Test mode keys work immediately** — we can build the entire payout flow against test mode before KYC completes.
- Payouts debit from our RazorpayX balance: a **Current Account** (partner banks: RBL / Yes Bank / IDFC First / Axis) — RazorpayX Lite is not open to new merchants. Linking an existing external bank account may also be possible → confirm with Razorpay support during activation.
- New supported option: **Composite Payout to Mobile Number** (no UPI ID needed). We'll keep this as a future fallback since we already store customer phone numbers.

### 1.1 KYC decision (still pending — decide before RazorpayX activation)

| Route | Documents needed | Note |
|---|---|---|
| **Individual / unregistered** | Personal PAN, CKYC (or Aadhaar/DigiLocker), bank account + IFSC | Simplest to start; check with Razorpay whether a RazorpayX Current Account can be opened for an individual — this is the risky part of this route |
| **Sole proprietorship** (recommended if we can) | 2 business-existence proofs — Udyam/MSME certificate, Shop & Establishment license, GST cert, IEC, postpaid mobile bill (any 2; Udyam/MSME certificate IS accepted) + owner PAN + owner address proof (Aadhaar etc.) + bank account | Udyam registration is free/online and unregistered businesses can get it quickly — cheapest bridge from "individual" to "proprietorship" |
| **Pvt Ltd / LLP / Partnership** | Business PAN, CIN + incorporation docs, MOA/AOA, board resolution / authorised signatory | Only relevant if we formally register the company |

> **Recommendation:** if currently unregistered → register Udyam (free, ~fast) and activate RazorpayX as a sole proprietorship. Decide before starting RazorpayX signup.

---

## 2. Current state (what already exists vs what's missing — audited 2026-10-29)

### Already built and reusable (zero work)
- `models/Payment.ts` — full Payment schema (paymentId, pickup, customer, amount, method, status, paidAt, reference, notes). Currently **orphaned** (no consumers).
- `models/Transaction.ts` — full Transaction schema incl. types `pickup_payment | refund | adjustment`. Currently **orphaned**.
- `models/Pickup.ts` — `paymentStatus` (pending/paid/failed/refunded), `paymentMethod` (cash/upi/bank_transfer), and a **pre-save hook that auto-completes the pickup when `paymentStatus === "paid"`**. This hook IS the integration contract.
- `lib/validations/payment.ts` — `createPaymentSchema`, `updatePaymentStatusSchema` (exported via `lib/validations/index.ts`, unused so far).
- Pickup status `payment_pending` is already in the state machine, collector UI, admin filters, analytics.
- `models/Notification.ts` — notification type `payment_received` defined, never fired yet.
- Admin UI shells: `app/admin/payments/page.tsx`, `app/admin/transactions/page.tsx` (complete UIs running on demo data in `lib/constants/adminDemoData.ts`).
- Customer/admin pickup pages already render payment method/status fields.

### Missing (the actual work)
- `services/payment/index.ts` — an empty stub (`const paymentService = {};`). All business logic goes here.
- ZERO API routes touch Payment/Transaction (checked all of `app/api/`).
- No customer payout-method storage anywhere (`models/User.ts` has only name/email/phone/role).
- No RazorpayX SDK/config/env.
- State machine: `COLLECTOR_ALLOWED_TRANSIONS → payment_pending: []` (dead end by design) in `services/pickup/index.ts` (line ~595).
- Collector UI: "Payment Integration Pending" placeholder banners in `app/collector/pickups/[id]/page.tsx` (lines ~545, ~820).
- Admin pickup detail: Payment Info section is read-only (no record-payout / trigger-payout actions).

---

## 3. Target architecture

### 3.1 Data model changes

**NEW model — `models/PayoutAccount.ts`** (separate collection; matches repo's one-model-per-collection pattern):

```ts
{
  user: ObjectId → User,
  type: "upi" | "bank_transfer",
  method: "upi" | "bank_transfer",
  upiVpa?: string,            // when type = upi
  accountNumber?: string,     // when type = bank_transfer  (masked after fund account creation)
  accountNumberMasked: string, // e.g. "xxxxxx1234" for UI display
  ifsc?: string,
  holderName: string,         // beneficiary name
  isDefault: boolean,
  verificationStatus: "pending" | "verified" | "failed",
  verifiedAt?: Date,
  razorpayContactId?: string,      // fs_... cached after first creation — reused forever
  razorpayFundAccountId?: string,  // fa_... cached after first creation — reused forever
  timestamps
}
```
Rules: raw bank account number is ONLY needed to create the Razorpay fund account + run validation. After that, payouts use the cached `razorpayFundAccountId`, so we stop storing the raw number (keep masked copy for UI). Keep a searchable index on `user`.

**Extend `models/Payment.ts`:**
```ts
method: "cash" | "upi" | "bank_transfer"      // existing (upi/bank_transfer = payout target type)
channel?: "manual" | "razorpayx"              // NEW: how it was recorded/paid
payoutId?: string,                            // NEW: razorpay payout entity id (pout_...)
attempts?: PayoutAttempt[] | number            // NEW: retry bookkeeping (keep simple: last error + count)
failureReason?: string,                       // NEW
initiatedBy?: ObjectId                        // NEW: admin/collector/system
```

**Extend `models/Transaction.ts`:** add optional `payment: ObjectId → Payment` link (keep everything else; `type: refund | adjustment` already exists for future needs).

**No change to `models/Pickup.ts`.** The pre-save hook already auto-completes on `paymentStatus: "paid"`. Do not remove it.

### 3.2 `services/payment/index.ts` (replaces the empty stub)

Phase A (manual):
- `recordManualPayment({ pickupId, method: cash|upi|bank_transfer, amount, reference?, recordedBy, notes? })`
  → creates Payment (status paid) + Transaction (type pickup_payment, status paid) → sets pickup `paymentStatus: "paid"` + `paymentMethod` → **pre-save hook auto-completes pickup** → fires `payment_received` notification. Idempotent: reject if a `paid` Payment already exists for the pickup.

Phase B (RazorpayX):
- `ensureRazorpayContact(user)` → create Contact once, cache `razorpayContactId`
- `ensureFundAccount(payoutAccount)` → create Fund Account once (VPA or bank), cache `razorpayFundAccountId`; disable raw-number storage afterwards
- `validatePayoutAccount(payoutAccount)` → Fund Account Validation (penny drop / VPA check; per-validation fee, do it once per account)
- `createPayout(payment)` → POST payouts with:
  - `account_number` = OUR RazorpayX account number (NOT the beneficiary's — past payouts that pass the beneficiary's number fail)
  - `X-Payout-Idempotency` = our `payment.paymentId` (mandatory header)
  - `mode: "UPI"` for VPA / `"IMPS"` or `"NEFT"` for bank, amount in **paise**
  - `purpose: "payout"`, `queue_if_low_balance: true`, `reference_id` = our paymentId, `narration` (first 9 chars matter — e.g. `SCRAPI PAY`)
  - IP allowlisting is mandatory → **deployment constraint, see §6**
- `applyPayoutStatus(payment, razorpayPayoutStatus)` → single source of truth for status mapping; dedupe-friendly (webhooks can fire more than once)

### 3.3 API routes (all `app/api/`)

| Route | Phase | Purpose |
|---|---|---|
| `POST /api/payments` | A | Manual record: collector/admin confirms cash or manual UPI against `payment_pending` pickup. Validated by `createPaymentSchema` (extended). |
| `GET /api/payments` (+filters) | A | Lists payments (customer/admin scopes) |
| `PATCH /api/payments/[id]` | B | Update status / record gateway status or failure reason (admin) |
| `POST /api/payments/[id]/payout` | B | Trigger RazorpayX payout for a pending Payment (admin button; later auto-trigger) |
| `POST /api/payments/webhook` | B | RazorpayX payout webhooks (verify signature with webhook secret; handle `payout.processed` / `payout.failed` / `payout.reversed` per docs; dedupe on payout id) |
| `GET/POST/DELETE /api/payout-accounts` | A | Customer manages their own UPI/bank payout methods |
| `POST /api/payout-accounts/[id]/validate` | B | Runs FAC/VPA validation via RazorpayX |
| `GET /api/admin/transactions` | C | Real data for admin Transactions page |
| `GET /api/admin/payments` | C | Real data for admin Payments page |

Auth: extend `lib/auth/require-auth.ts` usage — customer-only for payout-accounts; collector OR admin for manual recording; admin for payout trigger + PATCH.

### 3.4 State machine change

`services/pickup/index.ts`:
```ts
payment_pending: ["completed"]   // was: []
```
Guarded: transition to `completed` requires `pickup.paymentStatus === "paid"`. The pre-save hook already enforces "paid ⇒ completed" from the other direction, giving us a two-way safety net.

### 3.5 Notification additions
- fire existing `payment_received` on successful payment (customer notification).
- add new type `payout_failed` (Payment.ts/Notification.ts union set on both) so customers/admins see failed payouts instead of silent pending.

---

## 4. Phased build plan (what to build, in order)

### Phase A — Manual payment recording (no gateway, shippable the day it's built)
*Why first: zero dependency on RazorpayX KYC; pickups STOP dead-ending; the exact-but-simple business reality (collector pays cash / personal UPI at the doorstep and confirms it).*

1. `models/PayoutAccount.ts` + customer APIs + customer dashboard section "Payout Methods" (add UPI ID / bank details, choose default; bank number masked in UI).
2. Extend `lib/validations/payment.ts` (`manualPaymentSchema`: method, amount ≤ actualAmount, optional reference) and add payout-account schemas.
3. `services/payment/index.ts` → `recordManualPayment` (+ idempotency) + `payment_received` notification.
4. `POST /api/payments` route (collector + admin auth).
5. Unlock state machine (`payment_pending → completed`, guarded on paid).
6. Collector pickup page: replace both "Payment Integration Pending" placeholders with a "Record Payment" screen (final amount prefilled, method: cash / UPI / bank transfer, optional reference/txn id input, optional cash photo proof — recommended).
7. Admin pickup detail: "Record Payment" action + payment history block on Payment Info.
8. Update `paymentMethod` enum handling: `cash` + `upi_manual` label distinction where shown.

### Phase B — RazorpayX auto-payments (after KYC verified; buildable in test mode earlier)
1. Install SDK/HTTP client; env: `RAZORPAYX_KEY_ID`, `RAZORPAYX_KEY_SECRET`, `RAZORPAYX_ACCOUNT_NUMBER`, `RAZORPAYX_WEBHOOK_SECRET`.
2. `ensureRazorpayContact` / `ensureFundAccount` / `validatePayoutAccount` (only when customer saves a method — do validation once per account).
3. Flow when collector presses "Send Payment" (or admin triggers): create Payment (pending) → `createPayout` → status from webhook/fetch.
4. Webhook route with signature verification + dedupe by payout id; map docts:
   - processed → Payment paid + Transaction paid → pickup auto-completes (existing hook) → `payment_received` notification
   - failed / reversed → Payment failed → `payout_failed` notification → admin/task follow-up; keep manual recording as fallback
5. Admin pickups page: "Pay via RazorpayX" action on `payment_pending` pickups + payout status display.
6. Retry logic: failed payout → allowed retry with new idempotency attempt; store `failureReason`.
7. Keep the customer without a valid method on the manual path.

### Phase C — Replace demo data + financial reporting
1. `GET /api/admin/payments` + `GET /api/admin/transactions` (filters: status/type/date/pickup/customer — mirror existing UI filters).
2. Swap `adminPayments` / `adminTransactions` demo constants in `app/admin/payments/page.tsx` + `app/admin/transactions/page.tsx` to real data.
3. Admin Reports page totals from real Transactions.
4. Optional later: refunds/adjustments flows using Transaction `type: refund | adjustment` per the Cancellation & Refund policy page.

---

## 5. UI touch-points (full list)

| Location | Change |
|---|---|
| `app/collector/pickups/[id]/page.tsx` (2 placeholder blocks) | Phase A: Record Payment screen |
| `components/collector/PickupProgress.tsx` | relabel `payment_pending` step once real flow exists |
| Customer dashboard | new Payout Methods section |
| `app/(public)/pickup/[id]/page.tsx` + pickup-history | show payment status + payout reference once paid |
| `app/admin/pickups/[id]/page.tsx` Payment Info | record / trigger-payout actions + history |
| `app/admin/payments/page.tsx` | swap demo → real (Phase C) |
| `app/admin/transactions/page.tsx` | swap demo → real (Phase C) |
| `app/admin/reports/page.tsx` | real totals (Phase C) |
| Notification types | `payment_received` (fire), `payout_failed` (new) |

---

## 6. RazorpayX operational requirements (frame all of Phase B around these)

1. **IP allowlisting is mandatory** for payout API calls — but our Next.js serverless deployment has rotating egress IPs. Options (check during activation): (a) RazorpayX setting/dashboard toggle to disable IP allowlisting if support allows it, (b) static-egress proxy/static IP service, (c) trigger payouts from a cheap fixed-IP worker. **Flag this BEFORE building Phase B.**
2. **Idempotency key mandatory** — `X-Payout-Idempotency: <payment.paymentId>`.
3. **Server-to-server only** — never call payout APIs from client code.
4. **`account_number` = our RazorpayX account number** (Dashboard → My Account & Settings → Banking), not the beneficiary's.
5. Amounts in **paise**; UPI mode cap ₹1L (fine for us); bank mode IMPS ≤ ₹5L / NEFT ≤ ₹10Cr.
6. **Webhooks fire more than once** → dedupe on payout id + ignore stale-status events (e.g. ignore `processed` arriving after `reversed` → re-open).
7. Fund Account Validation (penny drop) before first payout of a bank account — per-validation fee; also supports VPA validation. For UPI VPA, forcing validation on customer-sided UPI IDs is optional but recommended.
8. Narration appears on customer's bank statement (first 9 chars significant) — e.g. `SCRAPI PAY`.
9. `queue_if_low_balance: true` so a low-balance day queues payouts instead of failing them.
10. Never store full bank account numbers long-term (fund-account-id suffices post-creation); store masked.

### Env additions (`.env.example`)
```
RAZORPAYX_KEY_ID=
RAZORPAYX_KEY_SECRET=          # never client-side
RAZORPAYX_ACCOUNT_NUMBER=      # OUR RazorpayX account number (payout debit source)
RAZORPAYX_WEBHOOK_SECRET=
```

---

## 7. Open questions (decide before/at build time)

1. **Registration status for RazorpayX KYC** (individual vs proprietorship via Udyam vs registered co) — §1.1 recommendation: Udyam.
2. **Funding source** — open RazorpayX Current Account (partner banks) vs link existing external bank account (ask Razorpay support during activation).
3. **Who can trigger payouts** — admin-only (safe) vs auto-trigger on entering `payment_pending` when customer has a verified method (recommended once Phase B is stable).
4. **Cash photo proof** — require optional/mandatory photo when collector records cash?
5. **VPA validation fee strategy** — validate every saved UPI ID (cost per validation) vs validate only on first payout?
6. Phase A `paymentMethod` value for manual UPI — reuse `"upi"` with channel `"manual"` (recommended) vs new enum value.

## 8. Deleted/renamed items to keep consistent (misc audit notes)
- `lib/constants/collectorDemoData.ts` uses `PaymentMethod = "cash" | "upi" | "other"` — align with real enum when touched.
- Terms/Privacy/Cancellation-refund pages already say payments "where enabled… Razorpay or another authorized provider" — no changes needed for payouts RazorpayX (still Razorpay family).
- `WhyChooseUs.tsx` "Secure Payments" copy is fine either way.
