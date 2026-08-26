import type { NitipCategory } from "@nitip/domain/catalog";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import {
  createProduct,
  getProductUploadSignature,
  listCategories,
  uploadProductImage,
} from "../../lib/api";

type SelectedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
};

export default function NewProductScreen() {
  const { outletId, outletName } = useLocalSearchParams<{
    outletId: string;
    outletName?: string;
  }>();
  const { user } = useAuth();
  const theme = useNitipTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme]);
  const [categories, setCategories] = useState<NitipCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [sortOrder, setSortOrder] = useState("0");
  const [cloudinaryReady, setCloudinaryReady] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !outletId) return;

    void listCategories(user, outletId)
      .then((items) => {
        setCategories(items.filter((item) => item.isActive));
        setCategoryId(
          (current) => current || items.find((item) => item.isActive)?.id || "",
        );
      })
      .catch((nextError: unknown) => {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Gagal memuat kategori",
        );
      });

    void getProductUploadSignature(user)
      .then(() => setCloudinaryReady(true))
      .catch(() => setCloudinaryReady(false));
  }, [user, outletId]);

  if (!user) return <Redirect href="/login" />;

  async function pickImage() {
    if (!cloudinaryReady) {
      setError(
        "Cloudinary belum dikonfigurasi. Aktifkan Cloudinary di API sebelum memilih foto.",
      );
      return;
    }

    setError(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Izin akses galeri diperlukan untuk memilih foto produk");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (asset.fileSize != null && asset.fileSize > 10 * 1024 * 1024) {
        setError("Ukuran foto maksimal 10 MB");
        return;
      }

      setSelectedImage({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
      });
      setImageUrl("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Gagal membuka galeri",
      );
    }
  }

  async function save() {
    if (!categoryId) {
      setError("Pilih kategori terlebih dahulu");
      return;
    }
    if (!name.trim()) {
      setError("Nama produk wajib diisi");
      return;
    }
    if (!price.trim() || !Number.isInteger(Number(price)) || Number(price) < 0) {
      setError("Harga wajib berupa angka Rupiah tanpa desimal");
      return;
    }
    if (
      stockQuantity.trim() &&
      (!Number.isInteger(Number(stockQuantity)) || Number(stockQuantity) < 0)
    ) {
      setError("Stok harus berupa angka bulat non-negatif");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let uploadedImage: {
        imageUrl: string | null;
        imagePublicId: string | null;
      } = {
        imageUrl: imageUrl.trim() || null,
        imagePublicId: null,
      };

      if (selectedImage) {
        uploadedImage = await uploadProductImage(user, selectedImage);
      }

      await createProduct(user, outletId, {
        categoryId,
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        imageUrl: uploadedImage.imageUrl,
        imagePublicId: uploadedImage.imagePublicId,
        stockQuantity: stockQuantity.trim() ? Number(stockQuantity) : null,
        isAvailable: true,
        isActive: true,
        sortOrder: Number(sortOrder || 0),
      });

      router.replace({
        pathname: "/menu",
        params: { outletId, outletName: outletName ?? "" },
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Gagal membuat produk",
      );
    } finally {
      setSaving(false);
    }
  }

  const previewUri = selectedImage?.uri || imageUrl.trim() || null;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Kembali</Text>
        </Pressable>
        <Text style={styles.brand}>nitip mitra.</Text>
      </View>

      <Text style={styles.eyebrow}>PRODUK BARU</Text>
      <Text style={styles.title}>Tambahkan produk.</Text>
      <Text style={styles.subtitle}>{outletName || "Outlet"}</Text>

      <View style={styles.cloudinaryCard}>
        <Text style={styles.cloudinaryTitle}>FOTO PRODUK</Text>
        <Text style={styles.cloudinaryStatus}>
          {cloudinaryReady === null
            ? "Memeriksa Cloudinary..."
            : cloudinaryReady
              ? "Cloudinary siap · signed upload"
              : "Cloudinary belum dikonfigurasi"}
        </Text>
        <Text style={styles.muted}>
          {cloudinaryReady
            ? "Pilih foto dari galeri. Foto baru di-upload saat produk disimpan."
            : "Produk tetap bisa dibuat tanpa foto. Aktifkan Cloudinary di API untuk upload langsung dari galeri."}
        </Text>

        {previewUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: previewUri }} style={styles.preview} />
            <Pressable
              onPress={() => {
                setSelectedImage(null);
                setImageUrl("");
              }}
            >
              <Text style={styles.removeImage}>Hapus foto</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          disabled={cloudinaryReady !== true || saving}
          onPress={() => void pickImage()}
          style={[
            styles.imageButton,
            (cloudinaryReady !== true || saving) && styles.disabled,
          ]}
        >
          <Text style={styles.imageButtonText}>
            {selectedImage ? "Ganti foto" : "Pilih foto dari galeri"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Kategori</Text>
        {categories.length === 0 ? (
          <Text style={styles.warning}>
            Belum ada kategori aktif. Buat kategori terlebih dahulu.
          </Text>
        ) : (
          <View style={styles.chips}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => setCategoryId(category.id)}
                style={[
                  styles.chip,
                  categoryId === category.id && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    categoryId === category.id && styles.chipTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>Nama produk</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nasi Ayam Original"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          maxLength={120}
        />

        <Text style={styles.label}>Deskripsi</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Opsional"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.multiline]}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />

        <Text style={styles.label}>Harga</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="number-pad"
          placeholder="12000"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Stok</Text>
        <TextInput
          value={stockQuantity}
          onChangeText={setStockQuantity}
          keyboardType="number-pad"
          placeholder="Kosongkan jika tidak dilacak"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />

        {!selectedImage && (
          <>
            <Text style={styles.label}>URL foto HTTPS · opsional</Text>
            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
              placeholder="https://res.cloudinary.com/..."
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
            />
          </>
        )}

        <Text style={styles.label}>Urutan tampil</Text>
        <TextInput
          value={sortOrder}
          onChangeText={setSortOrder}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          disabled={saving || !categoryId}
          onPress={() => void save()}
          style={[
            styles.button,
            (!categoryId || saving) && styles.disabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {saving
              ? selectedImage
                ? "Mengunggah & menyimpan..."
                : "Menyimpan..."
              : "Simpan produk"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: {
  background: string;
  surface: string;
  surfaceAccent: string;
  primary: string;
  primaryStrong: string;
  secondary: string;
  text: string;
  textMuted: string;
  border: string;
  onPrimary: string;
}) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      backgroundColor: colors.background,
      padding: 20,
      paddingTop: 54,
      paddingBottom: 40,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 28,
    },
    back: { color: colors.primary, fontWeight: "900" },
    brand: {
      color: colors.primaryStrong,
      fontWeight: "900",
      fontSize: 23,
      letterSpacing: -1,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    title: {
      color: colors.text,
      fontWeight: "900",
      fontSize: 30,
      letterSpacing: -1,
      marginTop: 5,
    },
    subtitle: { color: colors.textMuted, marginTop: 6, marginBottom: 16 },
    cloudinaryCard: {
      backgroundColor: colors.surfaceAccent,
      borderRadius: 17,
      padding: 14,
      marginBottom: 12,
    },
    cloudinaryTitle: {
      color: colors.primary,
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1,
    },
    cloudinaryStatus: {
      color: colors.text,
      fontWeight: "900",
      marginTop: 4,
    },
    muted: {
      color: colors.textMuted,
      fontSize: 10,
      lineHeight: 16,
      marginTop: 4,
    },
    previewWrap: { marginTop: 14 },
    preview: {
      width: "100%",
      aspectRatio: 1,
      borderRadius: 16,
      backgroundColor: colors.surface,
    },
    removeImage: {
      color: "#B42318",
      fontWeight: "800",
      fontSize: 11,
      marginTop: 8,
    },
    imageButton: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 13,
      alignItems: "center",
      paddingVertical: 12,
      marginTop: 13,
    },
    imageButtonText: { color: colors.primary, fontWeight: "900" },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 17,
    },
    label: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "800",
      marginTop: 15,
      marginBottom: 7,
    },
    warning: { color: "#B42318", fontSize: 11, lineHeight: 17 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 8,
    },
    chipActive: {
      backgroundColor: colors.primaryStrong,
      borderColor: colors.primaryStrong,
    },
    chipText: { color: colors.text, fontSize: 11, fontWeight: "800" },
    chipTextActive: { color: "#FFFFFF" },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      color: colors.text,
      paddingHorizontal: 13,
      paddingVertical: 12,
    },
    multiline: { minHeight: 82 },
    errorCard: {
      backgroundColor: colors.surfaceAccent,
      borderRadius: 13,
      padding: 12,
      marginTop: 16,
    },
    errorText: { color: colors.text, fontSize: 11, lineHeight: 17 },
    button: {
      backgroundColor: colors.primaryStrong,
      borderRadius: 14,
      alignItems: "center",
      paddingVertical: 14,
      marginTop: 20,
    },
    disabled: { opacity: 0.5 },
    buttonText: { color: "#FFFFFF", fontWeight: "900" },
  });
}
