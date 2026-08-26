# Nitip Theme

Brand palette diambil dari referensi warna yang diberikan untuk Nitip.

## Core palette

| Token | Hex | Peran utama |
|---|---|---|
| Navy | `#14216D` | brand dark, heading, dark surface |
| Blue | `#08349C` | primary action, link, active state |
| Aqua | `#A1DCD9` | secondary/accent, border, dark-mode text accent |
| Mint | `#CEFCD9` | highlight, soft surface, light-mode accent |

Empat warna di atas adalah warna brand inti. Neutral tint/shade boleh diturunkan dari palette untuk background, surface, dan accessibility. Warna status seperti error/warning/success tetap boleh memakai warna semantik terpisah agar informasi tidak bergantung pada brand color saja.

## Light mode

- Background: `#F7FFF9`
- Surface: `#FFFFFF`
- Surface accent: `#CEFCD9`
- Primary: `#08349C`
- Primary pressed / strong: `#14216D`
- Secondary: `#A1DCD9`
- Text: `#14216D`
- Muted text: `#52607F`
- Border: `#A1DCD9`

## Dark mode

- Background: `#0A123F`
- Surface: `#14216D`
- Elevated surface: `#08349C`
- Primary: `#A1DCD9`
- Primary pressed / highlight: `#CEFCD9`
- Secondary: `#08349C`
- Text: `#F7FFF9`
- Muted text: `#A1DCD9`
- Border: `#2942A1`

## Rules

1. Jangan hard-code brand color langsung di screen/component. Pakai semantic token dari `@nitip/theme`.
2. Theme mengikuti system appearance secara default dan nanti dapat dioverride user.
3. Dark mode bukan sekadar membalik warna. Navy menjadi surface utama, aqua/mint menjadi accent terang.
4. Gunakan primary blue untuk CTA utama pada light mode; pada dark mode gunakan aqua agar kontras tetap jelas.
5. Merchant, Driver, User, dan Admin memakai source token yang sama.
