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
- signature/policy upload media bila dibutuhkan
- payment gateway adapter
- order state transition
- dispatch
- ledger dan settlement

Secret Firebase Admin, MongoDB, Cloudinary API secret, dan payment gateway tidak boleh berada di aplikasi mobile.

### Realtime

MongoDB tetap menjadi system of record. Data sangat sementara dan high-frequency seperti live driver coordinates tidak wajib ditulis setiap detik ke collection order utama. Implementasi realtime/ephemeral store ditentukan saat fase tracking agar biaya dan write amplification tetap terkendali.

## Media storage — Cloudinary

Cloudinary menjadi pilihan utama untuk MVP Nitip karena Free plan dapat digunakan tanpa kartu kredit/debit dan sudah mencakup upload API, managed storage, image transformation, optimization, dan CDN dalam satu layanan.

Media utama:

- foto merchant/outlet
- foto produk/menu
- avatar user/driver/merchant
- proof of delivery yang berupa gambar

Untuk mobile, upload dapat dilakukan langsung ke Cloudinary. MVP dapat memakai unsigned upload preset yang dibatasi. Untuk operasi yang memerlukan kontrol lebih ketat, gunakan signed upload dengan signature dari Nitip API. API secret tidak boleh pernah disimpan di aplikasi Expo.

Simpan hanya metadata yang diperlukan di MongoDB, misalnya `publicId`, `secureUrl`, ukuran, tipe media, dan owner/resource id. Jangan simpan binary image di MongoDB.

Cloudflare R2 + ImageKit tidak dipakai selama keduanya mensyaratkan metode pembayaran untuk setup yang tersedia kepada tim. Appwrite tetap menjadi alternatif cadangan, tetapi Cloudinary dipilih karena alur image marketplace lebih sederhana dan Free plan-nya secara eksplisit tidak memerlukan kartu.

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
