# Nitip Backend Setup

Fondasi backend Nitip memakai Firebase Authentication, MongoDB Atlas, dan service `apps/api`.

## 1. Firebase

1. Buat project Firebase.
2. Tambahkan Web App untuk mendapatkan Firebase client config.
3. Authentication > Sign-in method > aktifkan Email/Password.
4. Project settings > Service accounts > Generate new private key.
5. Jangan commit service account JSON atau private key.

Copy `apps/user/.env.example` menjadi `apps/user/.env`, lalu isi nilai `EXPO_PUBLIC_FIREBASE_*` dari Firebase Web App config.

Copy `apps/api/.env.example` menjadi `apps/api/.env`, lalu isi `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, dan `FIREBASE_PRIVATE_KEY` dari service account.

## 2. MongoDB Atlas

1. Buat cluster Atlas Free.
2. Buat database user khusus Nitip.
3. Tambahkan IP development pada Network Access.
4. Ambil connection string dan masukkan ke `MONGODB_URI`.
5. Gunakan `nitip` sebagai `MONGODB_DB_NAME` untuk development awal.

MongoDB credential hanya berada di API, tidak di aplikasi Expo.

## 3. Install

Dari root repository:

```bash
npm install
```

## 4. Jalankan API

```bash
npm run dev:api
```

Health check:

```text
GET http://localhost:3001/health
```

Endpoint ini tetap hidup walaupun Firebase/MongoDB belum dikonfigurasi dan akan menampilkan status integrasi.

## 5. Jalankan User App

```bash
npm run dev:user
```

Untuk Android emulator, contoh `.env` memakai `http://10.0.2.2:3001`. Jika memakai perangkat fisik, ganti `EXPO_PUBLIC_API_URL` dengan IP LAN komputer, misalnya `http://192.168.1.10:3001`.

## Flow auth

```text
User login/register
  -> Firebase Authentication
  -> Firebase ID Token
  -> Authorization: Bearer <token>
  -> Nitip API /me
  -> Firebase Admin verifyIdToken()
  -> MongoDB users upsert by firebaseUid
  -> Nitip profile
```

Role tidak diterima dari client. User baru selalu dibuat sebagai `customer`; perubahan menjadi merchant/driver/admin akan melalui proses onboarding/admin terpisah.
