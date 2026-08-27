import type { NitipCategory, NitipProduct } from "@nitip/domain/catalog";
import { useNitipLanguage } from "@nitip/i18n";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../../components/AppHeader";
import { NitipIcon } from "../../../components/NitipIcon";
import { getMerchantCopy } from "../../../constants/merchantCopy";
import { useAuth } from "../../../context/AuthContext";
import { useNitipTheme } from "../../../hooks/useNitipTheme";
import {
  getProductUploadSignature,
  listCategories,
  listProducts,
  updateProduct,
  uploadProductImage,
} from "../../../lib/api";

type SelectedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
};

const EDIT_COPY = {
  id: {
    header: "Edit produk",
    eyebrow: "EDIT PRODUK",
    title: "Perbarui produk.",
    subtitle: "Ubah detail, harga, stok, foto, kategori, dan status produk.",
    loading: "Memuat produk...",
    loadError: "Gagal memuat produk",
    notFound: "Produk tidak ditemukan",
    notFoundDescription: "Produk ini mungkin sudah dihapus atau tidak lagi tersedia.",
    save: "Simpan perubahan",
    saveError: "Gagal memperbarui produk",
    sortInvalid: "Urutan tampil harus berupa angka bulat non-negatif",
    availability: "Ketersediaan",
    visibility: "Visibilitas",
    available: "Tersedia",
    soldOut: "Habis",
    visible: "Tampil",
    hidden: "Sembunyi",
    photoReadyDescription: "Pilih foto baru dari galeri atau pertahankan foto yang sekarang.",
  },
  en: {
    header: "Edit product",
    eyebrow: "EDIT PRODUCT",
    title: "Update product.",
    subtitle: "Change details, price, stock, photo, category, and product status.",
    loading: "Loading product...",
    loadError: "Failed to load product",
    notFound: "Product not found",
    notFoundDescription: "This product may have been deleted or is no longer available.",
    save: "Save changes",
    saveError: "Failed to update product",
    sortInvalid: "Display order must be a non-negative integer",
    availability: "Availability",
    visibility: "Visibility",
    available: "Available",
    soldOut: "Sold out",
    visible: "Visible",
    hidden: "Hidden",
    photoReadyDescription: "Choose a new gallery photo or keep the current photo.",
  },
} as const;

export default function EditProductScreen() {
  const { id, outletId, outletName } = useLocalSearchParams<{
    id: string;
    outletId: string;
    outletName?: string;
  }>();
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const copy = EDIT_COPY[language];
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState<NitipProduct | null>(null);
  const [categories, setCategories] = useState<NitipCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [sortOrder, setSortOrder] = useState("0");
  const [isAvailable, setIsAvailable] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [cloudinaryReady, setCloudinaryReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !outletId || !id) return;
    let active = true;

    setLoading(true);
    setError(null);
    setCloudinaryReady(null);

    Promise.all([listCategories(user, outletId), listProducts(user, outletId)])
      .then(([nextCategories, nextProducts]) => {
        if (!active) return;
        const nextProduct = nextProducts.find((item) => item.id === id) ?? null;
        setProduct(nextProduct);

        if (!nextProduct) return;

        setCategories(nextCategories.filter((item) => item.isActive || item.id === nextProduct.categoryId));
        setCategoryId(nextProduct.categoryId);
        setName(nextProduct.name);
        setDescription(nextProduct.description ?? "");
        setPrice(String(nextProduct.price));
        setStockQuantity(nextProduct.stockQuantity == null ? "" : String(nextProduct.stockQuantity));
        setImageUrl(nextProduct.imageUrl ?? "");
        setSelectedImage(null);
        setSortOrder(String(nextProduct.sortOrder));
        setIsAvailable(nextProduct.isAvailable);
        setIsActive(nextProduct.isActive);
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : copy.loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    void getProductUploadSignature(user)
      .then(() => {
        if (active) setCloudinaryReady(true);
      })
      .catch(() => {
        if (active) setCloudinaryReady(false);
      });

    return () => {
      active = false;
    };
  }, [copy.loadError, id, outletId, user]);

  if (!user) return <Redirect href="/login" />;

  async function pickImage() {
    if (!cloudinaryReady) {
      setError(c.product.cloudinaryRequired);
      return;
    }

    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(c.product.galleryPermission);
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
        setError(c.product.maxPhoto);
        return;
      }

      setSelectedImage({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : c.product.galleryError);
    }
  }

  async function save() {
    if (!product) return;
    if (!categoryId) {
      setError(c.product.selectCategory);
      return;
    }
    if (!name.trim()) {
      setError(c.product.nameRequired);
      return;
    }
    if (!price.trim() || !Number.isInteger(Number(price)) || Number(price) < 0) {
      setError(c.product.priceInvalid);
      return;
    }
    if (stockQuantity.trim() && (!Number.isInteger(Number(stockQuantity)) || Number(stockQuantity) < 0)) {
      setError(c.product.stockInvalid);
      return;
    }

    const parsedSortOrder = Number(sortOrder || 0);
    if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
      setError(copy.sortInvalid);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let nextImageUrl: string | null = imageUrl.trim() || null;
      let nextImagePublicId: string | null = product.imagePublicId;

      if (selectedImage) {
        const uploaded = await uploadProductImage(user, selectedImage);
        nextImageUrl = uploaded.imageUrl;
        nextImagePublicId = uploaded.imagePublicId;
      } else if (nextImageUrl !== product.imageUrl) {
        nextImagePublicId = null;
      }

      await updateProduct(user, outletId, product.id, {
        categoryId,
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        imageUrl: nextImageUrl,
        imagePublicId: nextImagePublicId,
        stockQuantity: stockQuantity.trim() ? Number(stockQuantity) : null,
        isAvailable,
        isActive,
        sortOrder: parsedSortOrder,
      });

      router.back();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  const previewUri = selectedImage?.uri || imageUrl.trim() || null;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom + 30, 42),
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <AppHeader title={copy.header} onBack={() => router.back()} />

      {loading ? (
        <View className="mt-6 items-center rounded-[22px] p-7" style={{ backgroundColor: theme.colors.surface }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{copy.loading}</Text>
        </View>
      ) : !product ? (
        <View className="mt-6 rounded-[22px] p-5" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-[12px] font-black" style={{ color: theme.colors.danger }}>{copy.notFound}</Text>
          <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
            {error ?? copy.notFoundDescription}
          </Text>
        </View>
      ) : (
        <>
          <View className="mt-7">
            <Text className="text-[9px] font-black tracking-[1.2px]" style={{ color: theme.colors.primary }}>{copy.eyebrow}</Text>
            <Text className="mt-2 text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{copy.title}</Text>
            <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{copy.subtitle}</Text>
            <Text className="mt-2 text-[9px] font-extrabold" style={{ color: theme.colors.primary }}>
              {outletName || c.common.outletFallback}
            </Text>
          </View>

          <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surfaceAccent }}>
            <View className="flex-row items-center gap-2">
              <NitipIcon color={theme.colors.primary} name="image" size={16} />
              <Text className="text-[9px] font-black tracking-[1px]" style={{ color: theme.colors.primary }}>{c.product.photoTitle}</Text>
            </View>
            <Text className="mt-2 text-[11px] font-black" style={{ color: theme.colors.text }}>
              {cloudinaryReady === null ? c.product.checkingCloudinary : cloudinaryReady ? c.product.cloudinaryReady : c.product.cloudinaryMissing}
            </Text>
            <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
              {cloudinaryReady ? copy.photoReadyDescription : c.product.photoMissingDescription}
            </Text>

            {previewUri ? (
              <View className="mt-4">
                <Image
                  source={{ uri: previewUri }}
                  className="w-full rounded-[20px]"
                  style={{ aspectRatio: 1, backgroundColor: theme.colors.surface }}
                />
                <Pressable
                  className="mt-2 self-start"
                  onPress={() => {
                    setSelectedImage(null);
                    setImageUrl("");
                  }}
                >
                  <Text className="text-[9px] font-black" style={{ color: theme.colors.danger }}>{c.product.removePhoto}</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              className="mt-4 min-h-[46px] flex-row items-center justify-center rounded-[16px]"
              disabled={cloudinaryReady !== true || saving}
              onPress={() => void pickImage()}
              style={{
                backgroundColor: theme.colors.surfaceRaised,
                opacity: cloudinaryReady !== true || saving ? 0.5 : 1,
              }}
            >
              <NitipIcon color={theme.colors.primary} name="image" size={15} />
              <Text className="ml-2 text-[10px] font-black" style={{ color: theme.colors.primary }}>
                {previewUri ? c.product.changePhoto : c.product.choosePhoto}
              </Text>
            </Pressable>
          </View>

          <View className="mt-3 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
            <Field label={c.product.category}>
              {categories.length === 0 ? (
                <View className="rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
                  <Text className="text-[9px] leading-4" style={{ color: theme.colors.danger }}>{c.product.noCategory}</Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap gap-2">
                  {categories.map((category) => {
                    const selected = category.id === categoryId;
                    return (
                      <Pressable
                        key={category.id}
                        onPress={() => setCategoryId(category.id)}
                        className="rounded-full px-3 py-2.5"
                        style={{ backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceRaised }}
                      >
                        <Text className="text-[9px] font-black" style={{ color: selected ? theme.colors.onPrimary : theme.colors.text }}>
                          {category.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Field>

            <Field label={c.product.name}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={c.product.namePlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                maxLength={120}
                className="min-h-[48px] rounded-[16px] px-4 text-[11px]"
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              />
            </Field>

            <Field label={c.product.description}>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={c.product.optional}
                placeholderTextColor={theme.colors.textMuted}
                maxLength={500}
                multiline
                textAlignVertical="top"
                className="min-h-[84px] rounded-[16px] px-4 py-3 text-[11px]"
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              />
            </Field>

            <Field label={c.product.price}>
              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
                placeholder="12000"
                placeholderTextColor={theme.colors.textMuted}
                className="min-h-[48px] rounded-[16px] px-4 text-[11px]"
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              />
            </Field>

            <Field label={c.product.stock}>
              <TextInput
                value={stockQuantity}
                onChangeText={setStockQuantity}
                keyboardType="number-pad"
                placeholder={c.product.stockPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                className="min-h-[48px] rounded-[16px] px-4 text-[11px]"
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              />
            </Field>

            {!selectedImage ? (
              <Field label={c.product.imageUrl}>
                <TextInput
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  autoCapitalize="none"
                  placeholder="https://res.cloudinary.com/..."
                  placeholderTextColor={theme.colors.textMuted}
                  className="min-h-[48px] rounded-[16px] px-4 text-[11px]"
                  style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
                />
              </Field>
            ) : null}

            <Field label={c.product.sort}>
              <TextInput
                value={sortOrder}
                onChangeText={setSortOrder}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.textMuted}
                className="min-h-[48px] rounded-[16px] px-4 text-[11px]"
                style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              />
            </Field>

            <Field label={copy.availability}>
              <View className="flex-row gap-2">
                <StatusOption label={copy.available} selected={isAvailable} onPress={() => setIsAvailable(true)} />
                <StatusOption label={copy.soldOut} selected={!isAvailable} onPress={() => setIsAvailable(false)} />
              </View>
            </Field>

            <Field label={copy.visibility}>
              <View className="flex-row gap-2">
                <StatusOption label={copy.visible} selected={isActive} onPress={() => setIsActive(true)} />
                <StatusOption label={copy.hidden} selected={!isActive} onPress={() => setIsActive(false)} />
              </View>
            </Field>

            {error ? (
              <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
                <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              className="mt-5 min-h-[50px] flex-row items-center justify-center rounded-[16px]"
              disabled={saving || !categoryId}
              onPress={() => void save()}
              style={{ backgroundColor: theme.colors.primary, opacity: saving || !categoryId ? 0.5 : 1 }}
            >
              {saving && selectedImage ? <ActivityIndicator color="#FFFFFF" /> : null}
              <Text className={`${saving && selectedImage ? "ml-2" : ""} text-[11px] font-black text-white`}>
                {saving ? selectedImage ? c.product.uploading : c.common.saving : copy.save}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );

  function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
      <View className="mt-3">
        <Text className="mb-2 text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>{label}</Text>
        {children}
      </View>
    );
  }

  function StatusOption({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        className="min-h-[44px] flex-1 items-center justify-center rounded-[14px] px-3"
        onPress={onPress}
        style={{ backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceRaised }}
      >
        <Text className="text-[9px] font-black" style={{ color: selected ? theme.colors.onPrimary : theme.colors.text }}>
          {label}
        </Text>
      </Pressable>
    );
  }
}
