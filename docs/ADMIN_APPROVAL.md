# Admin / Ops Merchant Approval

Nitip Ops uses Firebase email/password login and forwards the Firebase ID token to the Nitip API. Approval endpoints are never public.

## Authorization

The API grants Ops access when either condition is true:

- the Nitip user document has `role: "admin"`, or
- the verified Firebase account email is listed in server-only `ADMIN_EMAILS`.

`ADMIN_EMAILS` is intended as the MVP bootstrap mechanism. It supports multiple comma-separated emails.

A reviewer cannot approve or reject a merchant owned by the same Firebase UID.

## API setup

Add the Ops email to `apps/api/.env`:

```env
ADMIN_EMAILS=ops@example.com
```

Restart the API after changing environment variables.

For production, use a dedicated Ops account rather than the same account that owns a merchant.

## Admin app setup

Create `apps/admin/.env.local`:

```env
FIREBASE_WEB_API_KEY=YOUR_FIREBASE_WEB_API_KEY
NITIP_API_URL=http://localhost:3001
```

`FIREBASE_WEB_API_KEY` is the same Web API key already used by the Nitip Firebase client project. It is not the Firebase Admin service-account secret.

Run:

```powershell
npm run dev:api
npm run dev:admin
```

Open the Admin app, sign in with the Firebase account whose email is present in `ADMIN_EMAILS`, then review merchants that have status `pending_review`.

## Review behavior

Approve:

- status becomes `approved`
- `reviewedAt` is written
- the merchant becomes eligible for the public catalog when its outlet/category/product visibility requirements are also satisfied

Reject:

- a rejection reason is required
- status becomes `rejected`
- the Merchant app can edit the profile again and resubmit
- resubmission clears the previous review metadata

## Endpoints

```text
GET  /admin/me
GET  /admin/merchants
POST /admin/merchants/:id/review
```

Review request:

```json
{
  "decision": "approve"
}
```

or:

```json
{
  "decision": "reject",
  "reason": "Lengkapi data usaha terlebih dahulu."
}
```
