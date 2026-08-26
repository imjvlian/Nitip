# Nitip Architecture — v0.1

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

## Shared domain

`@nitip/domain` menyimpan kontrak yang harus sama di seluruh app:

- role
- order status
- formula ongkir/upah driver
- komisi merchant
- service fee
- helper nilai Rupiah

Nilai uang disimpan sebagai integer Rupiah. Jangan gunakan floating point untuk nilai settlement/payment.

## Backend boundary

Backend akan dipisahkan dari UI. Kandidat MVP: Supabase untuk Postgres/Auth/Realtime/Storage, dengan server-side integration untuk payment gateway dan operasi privileged.

Tidak ada secret payment gateway atau service-role key yang boleh berada di aplikasi mobile.

## Payment boundary

Aplikasi hanya mengenal konsep payment intent/status. Adapter provider (target awal: DOKU) akan berada pada backend/edge/server layer sehingga provider bisa diganti tanpa mengubah tiga aplikasi mobile.

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
