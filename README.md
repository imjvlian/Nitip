# Nitip

Nitip adalah ekosistem marketplace lokal yang menghubungkan pembeli, restoran/toko, dan driver dalam satu platform.

## Struktur aplikasi

- `apps/user` — aplikasi pembeli (Expo / React Native)
- `apps/merchant` — aplikasi restoran/toko (Expo / React Native)
- `apps/driver` — aplikasi driver (Expo / React Native)
- `apps/admin` — dashboard operasi Nitip (Next.js)
- `apps/api` — Nitip API (Fastify)
- `packages/domain` — tipe data dan aturan bisnis bersama
- `packages/theme` — brand palette + semantic light/dark theme
- `docs` — keputusan arsitektur dan dokumentasi produk

## Stack

### Frontend

- Expo SDK 57 + Expo Router
- React Native 0.86 + React 19.2
- Next.js 16.3.3 untuk dashboard admin
- npm workspaces (monorepo)
- TypeScript strict

### Backend

- Firebase Authentication
- Fastify API boundary
- MongoDB Atlas sebagai primary database
- Cloudinary untuk image upload, managed storage, optimization, transformation, dan CDN
- DOKU sebagai target awal payment adapter

Aplikasi mobile tidak menyimpan MongoDB credential, Firebase Admin secret, Cloudinary API secret, atau payment secret.

## Menjalankan project

Persyaratan: Node.js 22.13+ disarankan.

```bash
npm install
```

Nitip API:

```bash
npm run dev:api
```

Aplikasi User:

```bash
npm run dev:user
```

Aplikasi Merchant:

```bash
npm run dev:merchant
```

Aplikasi Driver:

```bash
npm run dev:driver
```

Dashboard Admin:

```bash
npm run dev:admin
```

Type check seluruh workspace:

```bash
npm run typecheck
```

Setup Firebase + MongoDB ada di `docs/BACKEND_SETUP.md`.

## Auth flow v0.2

`Firebase login/register -> Firebase ID token -> Nitip API -> verifyIdToken -> MongoDB users -> Nitip profile`

User baru selalu dibuat dengan role `customer`. Role merchant, driver, dan admin tidak diterima dari client dan akan menggunakan onboarding/authorization terpisah.

## Aturan bisnis awal

Draft pricing awal berada di `packages/domain/src/index.ts`.

- Komisi merchant: 8%
- Biaya layanan user: Rp1.000/order
- Minimum ongkir driver: Rp8.000 sampai 2 km
- 2–5 km: Rp2.000/km tambahan
- Di atas 5 km: Rp2.500/km tambahan
- Waiting fee setelah 10 menit: Rp500/menit, maksimal Rp5.000
- 100% delivery fare ditujukan ke driver

Angka di atas adalah konfigurasi awal untuk pengembangan dan simulasi, bukan tarif produksi final.
