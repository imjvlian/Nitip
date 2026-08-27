import { useNitipLanguage } from "@nitip/i18n";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { useNitipTheme } from "../../hooks/useNitipTheme";

const COPY = {
  id: {
    title: "Kebijakan privasi",
    intro: "Kebijakan ini menjelaskan secara ringkas bagaimana Nitip menangani data pengguna. Dokumen ini masih versi pengembangan dan perlu ditinjau secara legal sebelum peluncuran publik.",
    sections: [
      ["1. Data yang dikumpulkan", "Nitip dapat memproses data akun, alamat pengantaran, lokasi yang kamu pilih, informasi transaksi, status pesanan, laporan bantuan, serta tanggal lahir jika kamu menggunakan verifikasi usia."],
      ["2. Tujuan penggunaan data", "Data digunakan untuk autentikasi, pengelolaan profil, checkout, pengantaran, keamanan, dukungan pelanggan, pencegahan penyalahgunaan, dan pengembangan layanan."],
      ["3. Data lokasi", "Lokasi perangkat hanya digunakan saat fitur yang membutuhkan lokasi dijalankan dan izin diberikan. Koordinat alamat dapat disimpan untuk menghitung jarak dan membantu proses pengantaran."],
      ["4. Data usia", "Tanggal lahir digunakan untuk menghitung status 18+ pada server Nitip. Verifikasi usia saat ini berbasis tanggal lahir yang diberikan pengguna dan bukan pemeriksaan KTP atau identitas pemerintah."],
      ["5. Pihak ketiga", "Nitip menggunakan penyedia layanan seperti Firebase untuk autentikasi dan dapat menggunakan penyedia pembayaran, penyimpanan media, peta, atau infrastruktur lain sesuai fitur yang diaktifkan."],
      ["6. Keamanan dan penyimpanan", "Nitip menerapkan kontrol akses dan membatasi data sensitif agar tidak dikirim ke pihak yang tidak memerlukan. Tidak ada sistem yang sepenuhnya bebas risiko, sehingga praktik keamanan akan terus ditingkatkan."],
      ["7. Hak dan pertanyaan", "Kamu dapat memperbarui sebagian data profil melalui aplikasi dan menghubungi tim Nitip melalui Bantuan & Laporan untuk pertanyaan, koreksi, atau permintaan terkait privasi."],
    ],
  },
  en: {
    title: "Privacy policy",
    intro: "This policy briefly explains how Nitip handles user data. This is a development-version document and should receive legal review before public launch.",
    sections: [
      ["1. Data we collect", "Nitip may process account data, delivery addresses, locations you choose, transaction information, order status, support reports, and date of birth when you use age verification."],
      ["2. How data is used", "Data is used for authentication, profile management, checkout, delivery, security, customer support, abuse prevention, and service development."],
      ["3. Location data", "Device location is used only when a location-dependent feature is used and permission is granted. Address coordinates may be stored to calculate distance and support delivery."],
      ["4. Age data", "Date of birth is used by the Nitip server to calculate 18+ status. Current age verification is based on a user-provided birth date and is not a government-ID verification."],
      ["5. Third-party providers", "Nitip uses service providers such as Firebase for authentication and may use payment, media-storage, mapping, or infrastructure providers as related features are enabled."],
      ["6. Security and retention", "Nitip applies access controls and limits sensitive data from being shared with parties that do not need it. No system is completely risk-free, so security practices will continue to evolve."],
      ["7. Your choices and questions", "You can update some profile data in the app and contact the Nitip team through Help & Reports for privacy questions, corrections, or related requests."],
    ],
  },
} as const;

export default function PrivacyScreen() {
  const { language } = useNitipLanguage();
  const copy = COPY[language];
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom + 32, 44),
        backgroundColor: theme.colors.background,
      }}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader title={copy.title} />
      <View className="mt-7 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="text-[11px] leading-5" style={{ color: theme.colors.textMuted }}>
          {copy.intro}
        </Text>
      </View>
      <View className="mt-3 gap-3">
        {copy.sections.map(([title, body]) => (
          <View className="rounded-[22px] p-5" key={title} style={{ backgroundColor: theme.colors.surface }}>
            <Text className="text-[12px] font-black" style={{ color: theme.colors.text }}>{title}</Text>
            <Text className="mt-2 text-[10px] leading-5" style={{ color: theme.colors.textMuted }}>{body}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
