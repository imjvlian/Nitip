# Nitip

Nitip adalah ekosistem marketplace lokal yang menghubungkan pembeli, restoran/toko, dan driver dalam satu platform.

## Struktur aplikasi

- `apps/user` — aplikasi pembeli (Expo / React Native)
- `apps/merchant` — aplikasi restoran/toko (Expo / React Native)
- `apps/driver` — aplikasi driver (Expo / React Native)
- `apps/admin` — dashboard operasi Nitip (Next.js)
- `packages/domain` — tipe data dan aturan bisnis bersama
- `docs` — keputusan arsitektur dan dokumentasi produk

## Stack awal

- Expo SDK 57 + Expo Router
- React Native 0.86 + React 19.2
- Next.js 16.3.3 untuk dashboard admin
- npm workspaces (monorepo)
- TypeScript strict

Backend, auth, database, realtime, maps, dan payment provider akan ditambahkan bertahap setelah fondasi domain/order stabil.

## Menjalankan project

Persyaratan: Node.js 22 disarankan.

```bash
npm install
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
