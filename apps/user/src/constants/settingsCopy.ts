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
  preferences: string;
  preferencesDescription: string;
  language: string;
  languageDescription: string;
  appearance: string;
  appearanceDescription: string;
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
    accountDescription: "Kelola informasi akun dan alamat pengantaran.",
    accountInformation: "Informasi akun",
    accountInformationDescription: "Nama, email, dan nomor HP",
    addresses: "Alamat tersimpan",
    addressesDescription: (count) => `${count} alamat tersimpan`,
    preferences: "Preferensi",
    preferencesDescription: "Sesuaikan bahasa dan tampilan aplikasi.",
    language: "Bahasa",
    languageDescription: "Bahasa yang digunakan di aplikasi",
    appearance: "Tampilan",
    appearanceDescription: "Sistem, terang, atau gelap",
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
    accountDescription: "Manage account information and delivery addresses.",
    accountInformation: "Account information",
    accountInformationDescription: "Name, email, and phone number",
    addresses: "Saved addresses",
    addressesDescription: (count) => `${count} saved addresses`,
    preferences: "Preferences",
    preferencesDescription: "Customize app language and appearance.",
    language: "Language",
    languageDescription: "Language used throughout the app",
    appearance: "Appearance",
    appearanceDescription: "System, light, or dark",
    session: "Account",
    sessionDescription: "Manage your Nitip session on this device.",
    noResults: "No settings found",
    editAccountDescription: "Update the name and phone number used on Nitip.",
    addressesPageDescription: "Manage delivery addresses, the default address, and map points.",
    languagePageDescription: "Choose the language used throughout the Nitip User App.",
    appearancePageDescription: "Follow the system theme or choose light or dark mode.",
  },
};
