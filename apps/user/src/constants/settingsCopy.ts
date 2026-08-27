import type { NitipLanguage } from "@nitip/i18n";

export const SETTINGS_COPY: Record<NitipLanguage, {
  settings: string;
  search: string;
  account: string;
  accountDescription: string;
  accountInformation: string;
  accountInformationDescription: string;
  addresses: string;
  addressesDescription: (count: number) => string;
  ageVerification: string;
  ageVerificationDescription: string;
  ageStatusUnverified: string;
  ageStatusVerified: string;
  ageStatusUnderage: string;
  password: string;
  passwordDescription: string;
  preferences: string;
  preferencesDescription: string;
  language: string;
  languageDescription: string;
  appearance: string;
  appearanceDescription: string;
  helpLegal: string;
  helpLegalDescription: string;
  helpReport: string;
  helpReportDescription: string;
  terms: string;
  termsDescription: string;
  privacy: string;
  privacyDescription: string;
  session: string;
  sessionDescription: string;
  noResults: string;
  editAccountDescription: string;
  addressesPageDescription: string;
  languagePageDescription: string;
  appearancePageDescription: string;
}> = {
  id: {
    settings: "Pengaturan",
    search: "Cari pengaturan",
    account: "Akun",
    accountDescription: "Kelola informasi akun, keamanan, dan alamat pengantaran.",
    accountInformation: "Informasi akun",
    accountInformationDescription: "Nama, email, dan nomor HP",
    addresses: "Alamat tersimpan",
    addressesDescription: (count) => `${count} alamat tersimpan`,
    ageVerification: "Verifikasi usia",
    ageVerificationDescription: "Konfirmasi usia 18+ berdasarkan tanggal lahir",
    ageStatusUnverified: "Belum diverifikasi",
    ageStatusVerified: "18+ terverifikasi",
    ageStatusUnderage: "Di bawah 18 tahun",
    password: "Reset kata sandi",
    passwordDescription: "Kirim tautan reset ke email akun",
    preferences: "Preferensi",
    preferencesDescription: "Sesuaikan bahasa dan tampilan aplikasi.",
    language: "Bahasa",
    languageDescription: "Bahasa yang digunakan di aplikasi",
    appearance: "Tampilan",
    appearanceDescription: "Sistem, terang, atau gelap",
    helpLegal: "Bantuan & legal",
    helpLegalDescription: "Dapatkan bantuan dan baca informasi layanan Nitip.",
    helpReport: "Bantuan & laporan",
    helpReportDescription: "Kirim masalah atau laporan ke tim Nitip",
    terms: "Ketentuan layanan",
    termsDescription: "Aturan penggunaan layanan Nitip",
    privacy: "Kebijakan privasi",
    privacyDescription: "Cara Nitip mengelola data dan privasi",
    session: "Akun",
    sessionDescription: "Kelola sesi akun Nitip di perangkat ini.",
    noResults: "Pengaturan tidak ditemukan",
    editAccountDescription: "Perbarui nama dan nomor HP yang digunakan di Nitip.",
    addressesPageDescription: "Kelola alamat pengantaran, alamat utama, dan titik lokasi.",
    languagePageDescription: "Pilih bahasa yang digunakan di seluruh User App Nitip.",
    appearancePageDescription: "Gunakan tema sistem atau pilih mode terang maupun gelap.",
  },
  en: {
    settings: "Settings",
    search: "Search settings",
    account: "Account",
    accountDescription: "Manage account information, security, and delivery addresses.",
    accountInformation: "Account information",
    accountInformationDescription: "Name, email, and phone number",
    addresses: "Saved addresses",
    addressesDescription: (count) => `${count} saved addresses`,
    ageVerification: "Age verification",
    ageVerificationDescription: "Confirm 18+ age using date of birth",
    ageStatusUnverified: "Not verified",
    ageStatusVerified: "Verified 18+",
    ageStatusUnderage: "Under 18",
    password: "Reset password",
    passwordDescription: "Send a reset link to your account email",
    preferences: "Preferences",
    preferencesDescription: "Customize app language and appearance.",
    language: "Language",
    languageDescription: "Language used throughout the app",
    appearance: "Appearance",
    appearanceDescription: "System, light, or dark",
    helpLegal: "Help & legal",
    helpLegalDescription: "Get support and review Nitip service information.",
    helpReport: "Help & reports",
    helpReportDescription: "Send an issue or report to the Nitip team",
    terms: "Terms of service",
    termsDescription: "Rules for using Nitip services",
    privacy: "Privacy policy",
    privacyDescription: "How Nitip handles data and privacy",
    session: "Account",
    sessionDescription: "Manage your Nitip session on this device.",
    noResults: "No settings found",
    editAccountDescription: "Update the name and phone number used on Nitip.",
    addressesPageDescription: "Manage delivery addresses, the default address, and map points.",
    languagePageDescription: "Choose the language used throughout the Nitip User App.",
    appearancePageDescription: "Follow the system theme or choose light or dark mode.",
  },
};
