# DOKU Checkout integration

Nitip uses DOKU Checkout through the API service. DOKU credentials must never be placed in Expo apps.

## Server configuration

Set these values in `apps/api/.env`:

```env
DOKU_BASE_URL=https://api-sandbox.doku.com
DOKU_CLIENT_ID=YOUR_DOKU_CLIENT_ID
DOKU_SECRET_KEY=YOUR_DOKU_SECRET_KEY
DOKU_NOTIFICATION_URL=https://YOUR_PUBLIC_API_HOST/payments/doku/notification
```

For production, use `https://api.doku.com` and production credentials.

The Notification URL must also be configured in DOKU Back Office. Keep the path exactly `/payments/doku/notification`. DOKU requires a publicly reachable endpoint; use HTTPS for deployed environments. Do not expose the DOKU Secret Key to User, Merchant, or Driver apps.

## Implemented flow

1. Customer creates a Nitip order. Stock is reserved.
2. User App calls `POST /orders/:id/payment/doku`.
3. API signs `POST /checkout/v1/payment` using DOKU Non-SNAP HMAC-SHA256 signing and returns/stores `payment.url`.
4. User App opens the DOKU Checkout page.
5. DOKU sends HTTP Notification to `POST /payments/doku/notification`.
6. Nitip verifies the notification signature against the exact raw JSON body before processing it.
7. `SUCCESS` commits the stock reservation and changes the order to `paid`.
8. `EXPIRED` or Checkout `ORDER_EXPIRED` releases reserved stock and cancels the unpaid order.
9. `FAILED`, `PENDING`, `REDIRECT`, and `TIMEOUT` remain non-terminal for Checkout. Nitip does not incorrectly release stock from those statuses.
10. User App can call `POST /orders/:id/payment/doku/reconcile` to use DOKU Check Status when a webhook is delayed.
11. Duplicate DOKU notification Request IDs are handled idempotently.

Once a DOKU session is created, DOKU becomes the source of truth for payment expiry. Generic Nitip local payment expiry is disabled for that order so stock cannot be released while DOKU may still complete a payment.

## Sandbox verification

Use a test order with stock tracking enabled.

- Start DOKU Checkout and confirm a DOKU sandbox URL opens.
- Before payment, `payment.provider` must be `doku` and status must remain `pending`.
- Complete a sandbox payment and confirm the webhook changes the order to `paid` and stock reservation to `committed`.
- Send/retry the same notification and confirm stock/order are not processed twice.
- Test an expired Checkout and confirm the order becomes `cancelled` and reserved stock is restored once.
- Test the User App `Cek status` action after returning from DOKU.
- Confirm `FAILED` or `TIMEOUT` does not mark the order paid or release stock.
- Confirm a DOKU-paid order cannot be rejected locally by Merchant without a real refund/support process.

DOKU recommends using Check Status after roughly 60 seconds when payment completion has occurred but a final notification has not yet been observed.

## Refund boundary

Nitip does not fake a refund by only changing database state. DOKU refund capability differs by payment method and merchant activation. Until a real DOKU refund request is successfully processed, a DOKU-paid Merchant rejection is blocked and should go through Nitip support/operations.
