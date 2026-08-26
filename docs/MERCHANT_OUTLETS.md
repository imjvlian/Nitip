# Merchant & Outlet Foundation — v0.4

## Merchant onboarding

Akun Firebase tidak dapat mengubah role atau status merchant dari client.

Flow awal:

```text
Firebase account
  -> POST /merchant/onboarding
  -> merchants.status = draft
  -> merchant melengkapi profil dan outlet
  -> POST /merchant/me/submit
  -> merchants.status = pending_review
  -> Ops/Admin approval (fase berikutnya)
  -> approved
```

Status onboarding:

- `draft`
- `pending_review`
- `approved`
- `rejected`

Profil merchant disimpan di collection `merchants` dengan unique owner `ownerFirebaseUid`.

Client tidak dapat mengirim `status`, `role`, atau field approval.

## Outlet

Outlet disimpan di collection `outlets` dan selalu diakses melalui merchant milik Firebase UID yang sudah diverifikasi server.

Field utama:

- merchant id
- outlet name
- phone number
- address line
- optional GeoJSON Point
- active status
- accepting-orders status
- opening hours for all 7 days

Index:

- `merchantId + createdAt`
- `location` sebagai `2dsphere`

Titik lokasi boleh kosong sampai map picker tersedia.

## Jam operasional

Backend memakai jadwal per hari dengan format waktu `HH:MM` 24 jam. Untuk hari tutup, `opensAt` dan `closesAt` bernilai `null`.

UI v0.4 menggunakan satu pasangan jam buka/tutup untuk semua hari yang dipilih, tetapi contract API sudah mendukung jadwal berbeda per hari.

## Endpoint

Merchant:

- `GET /merchant/me`
- `POST /merchant/onboarding`
- `PATCH /merchant/me`
- `POST /merchant/me/submit`

Outlet:

- `GET /merchant/outlets`
- `POST /merchant/outlets`
- `PATCH /merchant/outlets/:id`
- `DELETE /merchant/outlets/:id`

Semua endpoint membutuhkan Firebase ID token.

## Security boundary

- Firebase menentukan identity.
- MongoDB menentukan merchant profile dan onboarding state.
- Client tidak dapat memilih merchant id yang ingin diakses.
- Server selalu mencari merchant berdasarkan Firebase UID lalu memakai merchant id hasil lookup.
- Draft/pending outlet belum otomatis dipublikasikan ke Customer App.
- Approval dan role promotion akan dikelola Ops/Admin, bukan Merchant App.
