# Customer Profile & Address — v0.3

## Profile

Customer profile tetap berada di collection `users` dan terhubung ke Firebase Authentication melalui `firebaseUid`.

Field yang dapat diedit customer:

- `displayName`
- `phoneNumber`

Email dan identitas Firebase tetap berasal dari identity provider. Role/status tidak dapat diubah dari client.

## Address

Alamat disimpan di collection `addresses`, terpisah dari `users`, agar dapat di-index dan dikembangkan untuk kebutuhan checkout/delivery tanpa memperbesar user document.

Field utama:

- owner `firebaseUid`
- label `home | office | other`
- custom label opsional
- recipient name
- phone number
- full address line
- notes opsional
- latitude/longitude opsional pada fase awal
- GeoJSON `Point` saat koordinat tersedia
- default address

Collection memiliki index owner dan `2dsphere` untuk field location.

## Default address invariant

- alamat pertama otomatis menjadi default
- hanya satu alamat per customer yang menjadi default
- menjadikan alamat lain default otomatis melepas default lama
- jika default address dihapus, alamat tersisa yang paling lama otomatis menjadi default

## API

- `GET /me`
- `PATCH /me`
- `GET /me/addresses`
- `POST /me/addresses`
- `PATCH /me/addresses/:id`
- `DELETE /me/addresses/:id`

Semua endpoint membutuhkan Firebase ID token dan hanya mengakses resource milik `firebaseUid` yang sudah diverifikasi server.

## Maps

UI v0.3 belum meminta customer mengetik koordinat secara manual. Latitude/longitude boleh `null` sampai map picker ditambahkan. Saat tersedia, API menyimpannya sebagai GeoJSON Point `[longitude, latitude]` agar siap untuk distance query dan delivery pricing.
