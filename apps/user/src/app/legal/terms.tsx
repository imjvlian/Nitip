import { useNitipLanguage } from "@nitip/i18n";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { useNitipTheme } from "../../hooks/useNitipTheme";

const COPY = {
  id: {
    title: "Ketentuan layanan",
    intro: "Ketentuan ini menjelaskan aturan dasar penggunaan Nitip. Dokumen ini masih versi pengembangan dan perlu ditinjau secara legal sebelum peluncuran publik.",
    sections: [
      ["1. Penggunaan layanan", "Kamu wajib menggunakan Nitip secara wajar, memberikan informasi akun yang benar, dan tidak menggunakan layanan untuk aktivitas yang melanggar hukum atau merugikan pihak lain."],
      ["2. Pesanan dan pembayaran", "Harga, biaya layanan, ongkir, ketersediaan produk, serta status pesanan dapat berubah sesuai kondisi transaksi. Pembayaran dianggap berhasil setelah Nitip menerima konfirmasi yang valid dari penyedia pembayaran."],
      ["3. Merchant dan driver", "Merchant bertanggung jawab atas produk dan kesiapan pesanan. Driver bertanggung jawab atas proses pengambilan dan pengantaran setelah menerima assignment yang sah dari Nitip."],
      ["4. Pembatalan, refund, dan sengketa", "Pembatalan dan refund mengikuti status pesanan, kebijakan merchant, penyedia pembayaran, dan hasil pemeriksaan Nitip. Pengguna dapat mengirim laporan melalui menu Bantuan & Laporan."],
      ["5. Keamanan akun", "Kamu bertanggung jawab menjaga akses akun. Jika kata sandi terlupa atau diduga diketahui pihak lain, gunakan fitur reset kata sandi dan segera amankan email yang terhubung."],
      ["6. Pembatasan layanan", "Nitip dapat membatasi, menangguhkan, atau menghentikan akses jika ditemukan penyalahgunaan, penipuan, risiko keamanan, atau pelanggaran ketentuan."],
      ["7. Perubahan ketentuan", "Nitip dapat memperbarui ketentuan ini untuk menyesuaikan fitur, aturan operasional, atau kewajiban hukum. Perubahan material akan diinformasikan melalui aplikasi atau kanal resmi Nitip."],
    ],
  },
  en: {
    title: "Terms of service",
    intro: "These terms describe the basic rules for using Nitip. This is a development-version document and should receive legal review before public launch.",
    sections: [
      ["1. Use of the service", "You must use Nitip responsibly, provide accurate account information, and not use the service for unlawful activity or conduct that harms others."],
      ["2. Orders and payments", "Prices, service fees, delivery fees, product availability, and order status may change based on the transaction. Payment is considered successful only after Nitip receives valid confirmation from the payment provider."],
      ["3. Merchants and drivers", "Merchants are responsible for products and order readiness. Drivers are responsible for pickup and delivery after receiving a valid assignment from Nitip."],
      ["4. Cancellations, refunds, and disputes", "Cancellations and refunds depend on order status, merchant policy, payment-provider rules, and Nitip review. Users can submit issues through Help & Reports."],
      ["5. Account security", "You are responsible for protecting account access. If your password is forgotten or may be compromised, use password reset and secure the connected email account."],
      ["6. Service restrictions", "Nitip may restrict, suspend, or terminate access when abuse, fraud, security risk, or a violation of these terms is identified."],
      ["7. Changes to these terms", "Nitip may update these terms to reflect features, operational rules, or legal obligations. Material changes will be communicated through the app or official Nitip channels."],
    ],
  },
} as const;

export default function TermsScreen() {
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
