# Product & Menu — v0.5

## Collections

- `categories`: kategori menu per outlet
- `products`: produk per outlet dan kategori

Kategori menyimpan `sortOrder` dan `isActive`. Produk menyimpan harga integer Rupiah, optional stock quantity, availability, visibility, optional image URL/public ID, dan sort order.

## Ownership

Semua route merchant mencari merchant dari Firebase UID yang sudah diverifikasi, lalu memastikan `outletId` benar-benar milik merchant tersebut. Client tidak mengirim `merchantId` sebagai sumber otorisasi.

## Merchant API

- `GET /merchant/outlets/:outletId/categories`
- `POST /merchant/outlets/:outletId/categories`
- `PATCH /merchant/outlets/:outletId/categories/:id`
- `DELETE /merchant/outlets/:outletId/categories/:id`
- `GET /merchant/outlets/:outletId/products`
- `POST /merchant/outlets/:outletId/products`
- `PATCH /merchant/outlets/:outletId/products/:id`
- `DELETE /merchant/outlets/:outletId/products/:id`
- `POST /merchant/media/signature`

Kategori yang masih berisi produk tidak dapat dihapus. Menghapus outlet akan menghapus kategori dan produk outlet tersebut.

## Public Catalog

- `GET /catalog/outlets`
- `GET /catalog/outlets/:id`

Endpoint publik hanya mengembalikan outlet aktif milik merchant dengan status `approved`. Merchant `draft`, `pending_review`, atau `rejected` tidak pernah muncul di katalog customer.

## Cloudinary

Nitip API membuat signed upload parameters memakai:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`CLOUDINARY_API_SECRET` hanya berada di API. Mobile menerima cloud name, API key, timestamp, folder, dan signature jangka pendek dari `/merchant/media/signature`, lalu file dapat di-upload langsung ke Cloudinary. API secret tidak dikirim ke aplikasi.

v0.5.0 menyiapkan signed-upload backend dan field media produk. Product form masih menerima optional HTTPS delivery URL agar katalog dapat dites tanpa menambah dependency native baru ke lockfile. Device image picker dapat dihubungkan ke helper `uploadProductImage` pada iterasi media berikutnya.

## Visibility

Customer hanya melihat:

1. merchant `approved`
2. outlet `isActive=true`
3. kategori `isActive=true`
4. produk `isActive=true`

Produk `isAvailable=false` tetap boleh tampil sebagai habis/tidak tersedia sehingga customer memahami item memang ada tetapi sedang tidak dapat dipesan.
