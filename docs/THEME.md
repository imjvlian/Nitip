# Nitip Design System 2.0

Dokumen ini adalah source of truth visual untuk rework UI Nitip mulai versi `0.12.x`.

Arah UI mengadaptasi hierarchy aplikasi food-delivery modern dari referensi yang diberikan: image-first commerce, search dan filter berbentuk pill, hero/header yang kuat, card yang lebih selektif, CTA lebar, bottom navigation yang compact, dan whitespace yang lebih lega. Nitip tidak menyalin referensi 1:1 dan tetap memakai identitas warna Nitip sendiri.

## Core palette

### Light

| Token | Hex | Peran |
|---|---|---|
| Background | `#FFFFFF` | background utama |
| Surface | `#F5F6F8` | section/card lembut |
| Surface Raised | `#FFFFFF` | sheet, floating nav, elevated control |
| Surface Accent | `#EEF1FF` | selected state / brand tint |
| Primary | `#2448F5` | CTA dan active state |
| Primary Strong | `#1836C9` | pressed / emphasis |
| Text | `#111318` | foreground utama |
| Muted | `#7C8190` | secondary copy |
| Border | `#E7E9EE` | separator ringan |

### Dark

| Token | Hex | Peran |
|---|---|---|
| Background | `#0F1014` | background utama |
| Surface | `#191B20` | section/card lembut |
| Surface Raised | `#22242B` | sheet, floating nav, elevated control |
| Surface Accent | `#242943` | selected state / brand tint |
| Primary | `#5A72FF` | CTA dan active state |
| Primary Strong | `#AAB7FF` | pressed / highlight |
| Text | `#F7F7F8` | foreground utama |
| Muted | `#9A9FAA` | secondary copy |
| Border | `#2C3038` | separator ringan |

Warna semantik danger/success/warning tetap terpisah dari brand agar status tidak bergantung pada cobalt saja.

## Typography

Gunakan hierarchy berikut sebagai default sebelum membuat ukuran ad-hoc:

- Display: 32 / 38, weight 900
- Title: 26 / 32, weight 900
- Heading: 20 / 26, weight 800
- Body: 15 / 22, weight 500
- Label: 13 / 18, weight 800
- Caption: 11 / 16, weight 600

## Spacing & radius

Spacing utama mengikuti grid `4, 8, 12, 16, 20, 24, 32, 40, 48`.

Radius default:

- Small control: 10
- Compact card/input: 14
- Standard card: 18
- Large section/card: 24
- Hero/sheet: 30
- Pill/chip: 999

Screen horizontal padding default adalah 20. Jarak antar section besar default 28. Minimum touch target 44.

## Layout principles

1. **Image first untuk consumer UI.** Foto outlet/produk harus menjadi elemen utama pada User app, bukan dekorasi kecil.
2. **Card hanya saat dibutuhkan.** Hindari nested card dan border berlapis. Gunakan whitespace dan typography untuk hierarchy.
3. **Satu primary CTA per context.** Cobalt dipakai sebagai action utama; jangan memenuhi seluruh screen dengan warna brand.
4. **Floating/elevated navigation seperlunya.** Bottom navigation memakai surface raised yang compact dan jelas, bukan panel besar.
5. **Pill untuk search/filter/category.** Gunakan radius pill untuk state yang memang bersifat filter/selection, bukan semua container.
6. **Hero boleh gelap pada Light Mode.** Section hero dapat memakai `#0F1014` dengan text putih untuk menghasilkan contrast seperti referensi, sementara CTA tetap cobalt.
7. **Dark mode didesain, bukan diinvert.** Surface hierarchy harus tetap terlihat dengan `#191B20` dan `#22242B`.
8. **Merchant dan Driver tetap satu keluarga visual, tetapi bukan copy User.** Merchant lebih operational, Driver lebih task-oriented.

## Shared tokens

`@nitip/theme` adalah source of truth untuk:

- semantic light/dark colors
- spacing
- radius
- typography
- layout measurements
- motion duration

User dan Merchant ThemeContext harus mengambil warna dari package ini, bukan menduplikasi palette lokal.

Tailwind preset di `packages/theme/tailwind-preset.cjs` mencerminkan token yang sama untuk NativeWind class names.

## Rework sequence

1. `0.12.0` — Design System 2.0 foundation
2. User shell + bottom navigation
3. User Home
4. Outlet/menu
5. Product detail
6. Cart
7. Checkout
8. Orders + order detail
9. Profile/settings
10. Merchant rework
11. Driver rework
12. Cross-app consistency and accessibility pass

Business logic, auth, API contract, pricing, payment state, order transitions, dan database rules tidak boleh berubah hanya karena UI rework.
