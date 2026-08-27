# Nitip Payment & Settlement Foundation

This document describes the payment boundary that must exist before Nitip enables real customer payments or merchant/driver payouts.

## Current state

- Customer orders are created as `pending_payment`.
- Stock can be reserved for the payment window and is released when that window expires.
- Development builds can still use the existing simulated-payment route.
- Production does not expose simulated payment.
- DOKU is the target payment provider, but no customer-facing DOKU payment endpoint or webhook is enabled yet.

## Domain payment states

Nitip payment state is intentionally separate from order fulfillment state.

- `pending`: payment has been created but not confirmed.
- `paid`: provider confirmation has been accepted by Nitip.
- `failed`: provider rejected or failed the payment attempt.
- `expired`: the payment window expired without a successful payment.
- `refunded`: a previously paid transaction has been refunded.

Supported provider identifiers start with:

- `development`
- `doku`

Payment method families are normalized into `simulation`, `qris`, `virtual_account`, `card`, `e_wallet`, `paylater`, `convenience_store`, and `unknown`.

## Merchant settlement states

Settlement is separate from payment and order fulfillment.

- `pending`: money is not eligible for payout yet.
- `eligible`: the order has met settlement requirements and can enter a payout batch.
- `settled`: merchant payout has been recorded as completed.
- `reversed`: a previously eligible or settled amount has been reversed.

The merchant settlement amount must use the server-calculated `merchantNet`. Client applications must never calculate or overwrite settlement amounts.

## DOKU configuration

All DOKU credentials are server-only.

```env
DOKU_BASE_URL=https://api-sandbox.doku.com
DOKU_CLIENT_ID=
DOKU_SECRET_KEY=
DOKU_NOTIFICATION_URL=
```

Production should use `https://api.doku.com`.

`apps/api/src/lib/doku.ts` contains the reusable non-SNAP DOKU Checkout helpers for:

- SHA-256 request-body digest.
- HMAC-SHA256 request signature.
- Timing-safe signature verification.
- DOKU request headers with unique `Request-Id` and UTC timestamp.
- Checkout request body construction.
- Backend request to `POST /checkout/v1/payment`.

The helper is not yet wired to a public Nitip route. This is intentional: Nitip must have an idempotent notification/webhook path before customers can initiate real DOKU payments.

## Required integration order

1. Add persisted payment fields to the order document while keeping existing orders backward-compatible.
2. Add checkout idempotency so retries cannot create duplicate orders or duplicate provider requests.
3. Add DOKU payment initiation for an existing `pending_payment` order.
4. Persist provider request/reference IDs and checkout URL server-side.
5. Add DOKU HTTP Notification endpoint.
6. Verify the notification signature before reading it as trusted payment state.
7. Make notification processing idempotent by provider event/request identity.
8. Commit reserved stock only when the transition to `paid` succeeds.
9. Release reserved stock on expiry/cancellation.
10. Add refund state and reconciliation before merchant settlement can be considered final.
11. Only after settlement records are authoritative, enable merchant payout and driver earnings payout flows.

## Safety rules

- Never place `DOKU_SECRET_KEY` in Expo environment variables or mobile bundles.
- Never mark an order as paid from a client callback/redirect alone.
- Never trust payment amount, merchant net, commission, or driver fare from a client.
- Never process the same provider notification twice.
- Payment and order status transitions must be performed server-side and atomically where they affect reserved stock.
