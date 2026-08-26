# Nitip Backend Setup

Fondasi backend Nitip memakai Firebase Authentication, MongoDB Atlas, dan service `apps/api`.

## 1. Firebase Client

1. Buat project Firebase.
2. Tambahkan Web App untuk mendapatkan Firebase client config.
3. Authentication > Sign-in method > aktifkan Email/Password.
4. Copy `apps/user/.env.example` menjadi `apps/user/.env`.
5. Isi nilai `EXPO_PUBLIC_FIREBASE_*` dari Firebase Web App config.

Firebase client config boleh berada di aplikasi. Yang tidak boleh masuk ke APK/repository adalah Firebase Admin credential/service account.

## 2. Firebase Admin untuk Nitip API

1. Firebase Console > Project settings > Service accounts.
2. Pilih **Generate new private key** lalu simpan file JSON dengan aman.
3. Buat folder lokal `apps/api/secrets`.
4. Rename/copy file JSON menjadi:

```text
apps/api/secrets/firebase-service-account.json
```

Folder `apps/api/secrets/` sudah di-ignore Git.

Copy `apps/api/.env.example` menjadi `apps/api/.env`. Untuk development lokal gunakan:

```env
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-service-account.json
```

Nitip API memakai Firebase Admin Application Default Credentials untuk membaca file tersebut. Jangan commit service account JSON.

## 3. MongoDB Atlas

1. Buat Atlas project untuk Nitip.
2. Buat **Free cluster**.
3. Buat database user khusus Nitip dan simpan password-nya.
4. Tambahkan IP komputer development pada Network Access.
5. Pada cluster pilih Connect > Drivers dan copy connection string `mongodb+srv://...`.
6. Ganti placeholder username/password pada connection string.
7. Masukkan ke `apps/api/.env` sebagai `MONGODB_URI`.
8. Gunakan `nitip` sebagai `MONGODB_DB_NAME` untuk development awal.

Contoh:

```env
MONGODB_URI=mongodb+srv://nitip_api:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=nitip
```

Jika password mengandung karakter URI khusus seperti `@`, `:`, `/`, `?`, atau `#`, URL-encode password atau buat password baru yang aman tetapi mudah dipakai pada connection string.

MongoDB credential hanya berada di API, tidak di aplikasi Expo.

## 4. Install

Dari root repository:

```bash
npm install
```

## 5. Jalankan API

```bash
npm run dev:api
```

Health check:

```text
GET http://localhost:3001/health
```

Jika Firebase dan MongoDB sudah terkonfigurasi, response seharusnya menunjukkan kedua integrasi aktif.

## 6. Jalankan User App

```bash
npm run dev:user
```

Untuk Android emulator, `EXPO_PUBLIC_API_URL` gunakan:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001
```

Jika memakai perangkat fisik, ganti dengan IP LAN komputer, misalnya `http://192.168.1.10:3001`.

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
