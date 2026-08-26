# Nitip Architecture — v0.2

## Tujuan

Satu source of truth untuk tiga aplikasi mobile dan satu dashboard operasi tanpa menduplikasi aturan bisnis.

## Apps

### User
Discovery merchant, katalog/menu, cart, checkout, payment, tracking, rating, support.

### Merchant
Store availability, menu & stock, incoming orders, preparation status, revenue, settlement.

### Driver
Availability, dispatch, pickup, navigation, proof of delivery, earnings, payout.

### Admin / Ops
Order control tower, merchant/driver management, pricing rules, refund/dispute, settlement, promo, fraud signals, support.

## Shared packages

`@nitip/domain` menyimpan kontrak yang harus sama di seluruh app:

- role
- order status
- formula ongkir/upah driver
- komisi merchant
- service fee
- helper nilai Rupiah

`@nitip/theme` menyimpan brand palette dan semantic theme untuk light/dark mode agar User, Merchant, Driver, dan Admin memakai sistem warna yang sama.

Nilai uang disimpan sebagai integer Rupiah. Jangan gunakan floating point untuk nilai settlement/payment.

## Backend stack

### Authentication — Firebase Authentication

Firebase menjadi identity provider utama. MVP memprioritaskan email/password dan Google sign-in. Phone OTP tidak dijadikan metode default karena memiliki biaya per verifikasi dan kompleksitas tambahan di mobile.

Client mendapatkan Firebase ID token, lalu backend memverifikasi token dengan Firebase Admin SDK. Role dan authorization aplikasi tetap diputuskan backend/database, bukan dipercaya dari data yang dapat diedit client.

### Primary database — MongoDB Atlas

MongoDB menjadi system of record untuk:

- user profile
- merchant dan outlet
- product/menu
- cart/order
- driver profile
- dispatch
- ledger
- settlement
- promo
- audit metadata

Aplikasi mobile tidak boleh terhubung langsung menggunakan MongoDB database credentials. Semua akses privileged melewati Nitip API.

Firebase UID disimpan sebagai external identity key pada user document sehingga Authentication dan domain data tetap terpisah.

### API layer

Tambahkan service `apps/api` pada fase backend. API bertanggung jawab untuk:

- verifikasi Firebase ID token
- authorization berbasis role/resource ownership
- akses MongoDB
- signed media upload
- payment gateway adapter
- order state transition
- dispatch
- ledger dan settlement

Secret Firebase Admin, MongoDB, payment gateway, dan object-storage tidak boleh berada di aplikasi mobile.

### Realtime

MongoDB tetap menjadi system of record. Data sangat sementara dan high-frequency seperti live driver coordinates tidak wajib ditulis setiap detik ke collection order utama. Implementasi realtime/ephemeral store ditentukan saat fase tracking agar biaya dan write amplification tetap terkendali.

## Media storage

Target pilihan untuk Nitip adalah:

1. **Cloudflare R2** sebagai object storage utama.
2. **ImageKit** sebagai optimization/transformation/CDN layer untuk gambar merchant, menu, avatar, dan proof images.

Alasan: object storage dan image processing dipisah, file tidak terkunci ke database/backend vendor, URL delivery dapat dioptimalkan berdasarkan ukuran device, dan storage dapat diskalakan secara independen.

Appwrite Storage tetap menjadi fallback jika kita membutuhkan solusi all-in-one yang lebih sederhana, tetapi bukan pilihan utama saat ini.

Upload dilakukan menggunakan short-lived signed upload URL dari backend. Jangan menaruh R2 secret/access key di aplikasi.

## Payment boundary

Aplikasi hanya mengenal konsep payment intent/status. Adapter provider (target awal: DOKU) berada pada backend/server layer sehingga provider bisa diganti tanpa mengubah tiga aplikasi mobile.

## Order state (draft)

`pending_payment → paid → merchant_confirmed → preparing → ready_for_pickup → driver_assigned → picked_up → on_delivery → delivered`

Terminal/exception state: `cancelled`, `refunded`.

Perubahan status harus divalidasi backend, bukan dipercaya dari client.

## Driver pricing v0.1

- Minimum Rp8.000 sampai 2 km.
- >2–5 km: Rp2.000 per km tambahan, dibulatkan ke atas per km.
- >5 km: Rp2.500 per km tambahan, dibulatkan ke atas per km.
- Waiting grace 10 menit.
- Waiting fee Rp500/menit setelah grace, cap Rp5.000.
- Waiting fee default disubsidi platform pada formula awal; kebijakan merchant penalty dapat ditambahkan kemudian.

## Prinsip settlement

Driver dan merchant memakai ledger. Payout tidak dilakukan per order. Order settlement dan payout adalah dua konsep berbeda.
