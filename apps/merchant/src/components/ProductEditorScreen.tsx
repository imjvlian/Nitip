import type {
  CreateNitipProductAddonInput,
  NitipCategory,
  NitipProduct,
} from "@nitip/domain/catalog";
import { formatRupiah } from "@nitip/domain";
import { useNitipLanguage } from "@nitip/i18n";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMerchantCopy } from "../constants/merchantCopy";
import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import {
  createProduct,
  getProductUploadSignature,
  listCategories,
  listProducts,
  updateProduct,
  uploadProductImage,
} from "../lib/api";
import { AppHeader } from "./AppHeader";
import { NitipIcon } from "./NitipIcon";

type Mode = "create" | "edit";
type SelectedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
};

type AddonDraft = {
  id?: string;
  name: string;
  price: string;
  isAvailable: boolean;
};

const LOCAL_COPY = {
  id: {
    createHeader: "Produk baru",
    editHeader: "Edit produk",
    createTitle: "Tambahkan menu baru.",
    editTitle: "Perbarui menu.",
    subtitle: "Lengkapi deskripsi, harga, stok, foto, dan add-on yang bisa dipilih pelanggan.",
    descriptionRequired: "Deskripsi menu wajib diisi.",
    descriptionPlaceholder: "Contoh: ayam bakar dengan sambal rumah, lalapan, dan nasi hangat.",
    addonsTitle: "Add-ons",
    addonsDescription: "Tambahkan ekstra yang bisa dipilih pelanggan, misalnya telur, keju, sambal, atau topping lain.",
    addonName: "Nama add-on",
    addonPrice: "Harga tambahan",
    addonPlaceholder: "Contoh: Telur",
    addonPricePlaceholder: "3000",
    addAddon: "Tambah add-on",
    addonInvalid: "Setiap add-on harus memiliki nama dan harga berupa angka bulat non-negatif.",
    addonDuplicate: "Nama add-on tidak boleh sama.",
    maxAddons: "Maksimal 20 add-on per menu.",
    active: "Aktif",
    inactive: "Nonaktif",
    saving: "Menyimpan...",
    save: "Simpan produk",
    update: "Simpan perubahan",
    loading: "Memuat produk...",
    loadError: "Gagal memuat produk",
    saveError: "Gagal menyimpan produk",
    availability: "Ketersediaan",
    visibility: "Visibilitas",
    available: "Tersedia",
    soldOut: "Habis",
    visible: "Tampil",
    hidden: "Sembunyi",
    sortInvalid: "Urutan tampil harus berupa angka bulat non-negatif.",
  },
  en: {
    createHeader: "New product",
    editHeader: "Edit product",
    createTitle: "Add a new menu item.",
    editTitle: "Update menu item.",
    subtitle: "Complete the description, price, stock, photo, and optional add-ons customers can choose.",
    descriptionRequired: "Menu description is required.",
    descriptionPlaceholder: "Example: grilled chicken with house sambal, vegetables, and steamed rice.",
    addonsTitle: "Add-ons",
    addonsDescription: "Add optional extras customers can choose, such as egg, cheese, sambal, or toppings.",
    addonName: "Add-on name",
    addonPrice: "Extra price",
    addonPlaceholder: "Example: Egg",
    addonPricePlaceholder: "3000",
    addAddon: "Add add-on",
    addonInvalid: "Every add-on needs a name and a non-negative integer price.",
    addonDuplicate: "Add-on names must be unique.",
    maxAddons: "Maximum 20 add-ons per menu item.",
    active: "Active",
    inactive: "Inactive",
    saving: "Saving...",
    save: "Save product",
    update: "Save changes",
    loading: "Loading product...",
    loadError: "Failed to load product",
    saveError: "Failed to save product",
    availability: "Availability",
    visibility: "Visibility",
    available: "Available",
    soldOut: "Sold out",
    visible: "Visible",
    hidden: "Hidden",
    sortInvalid: "Display order must be a non-negative integer.",
  },
} as const;

function addonsFromProduct(product: NitipProduct): AddonDraft[] {
  return product.addons.map((addon) => ({
    id: addon.id,
    name: addon.name,
    price: String(addon.price),
    isAvailable: addon.isAvailable,
  }));
}

export function ProductEditorScreen({ mode }: { mode: Mode }) {
  const { id, outletId, outletName } = useLocalSearchParams<{
    id?: string;
    outletId: string;
    outletName?: string;
  }>();
  const { language } = useNitipLanguage();
  const copy = LOCAL_COPY[language];
  const c = getMerchantCopy(language);
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
  const [sortOrder, setSortOrder] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [addons, setAddons] = useState<AddonDraft[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [cloudinaryReady, setCloudinaryReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !outletId) return;
    let active = true;
    setError(null);

    const categoryRequest = listCategories(user, outletId);
    const productRequest = mode === "edit" ? listProducts(user, outletId) : Promise.resolve([] as NitipProduct[]);

    Promise.all([categoryRequest, productRequest])
      .then(([nextCategories, products]) => {
        if (!active) return;
        const nextProduct = mode === "edit" ? products.find((item) => item.id === id) ?? null : null;
        const visibleCategories = nextCategories.filter(
          (item) => item.isActive || item.id === nextProduct?.categoryId,
        );
        setCategories(visibleCategories);

        if (mode === "create") {
          setCategoryId((current) => current || visibleCategories[0]?.id || "");
          return;
        }

        if (!nextProduct) {
          setError(copy.loadError);
          return;
        }

        setProduct(nextProduct);
        setCategoryId(nextProduct.categoryId);
        setName(nextProduct.name);
        setDescription(nextProduct.description);
        setPrice(String(nextProduct.price));
        setStockQuantity(nextProduct.stockQuantity == null ? "" : String(nextProduct.stockQuantity));
        setSortOrder(String(nextProduct.sortOrder));
        setImageUrl(nextProduct.imageUrl ?? "");
        setSelectedImage(null);
        setAddons(addonsFromProduct(nextProduct));
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
  }, [copy.loadError, id, mode, outletId, user]);

  const parsedAddons = useMemo(() => {
    const normalizedNames = new Set<string>();
    const result: CreateNitipProductAddonInput[] = [];

    for (const addon of addons) {
      const trimmedName = addon.name.trim();
      const parsedPrice = Number(addon.price);
      if (!trimmedName || !addon.price.trim() || !Number.isInteger(parsedPrice) || parsedPrice < 0) {
        return { value: null, error: copy.addonInvalid };
      }
      const normalizedName = trimmedName.toLocaleLowerCase();
      if (normalizedNames.has(normalizedName)) {
        return { value: null, error: copy.addonDuplicate };
      }
      normalizedNames.add(normalizedName);
      result.push({
        ...(addon.id ? { id: addon.id } : {}),
        name: trimmedName,
        price: parsedPrice,
        isAvailable: addon.isAvailable,
      });
    }

    return { value: result, error: null };
  }, [addons, copy.addonDuplicate, copy.addonInvalid]);

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

  function addAddon() {
    if (addons.length >= 20) {
      setError(copy.maxAddons);
      return;
    }
    setAddons((current) => [...current, { name: "", price: "", isAvailable: true }]);
  }

  function updateAddon(index: number, patch: Partial<AddonDraft>) {
    setAddons((current) => current.map((addon, addonIndex) => (addonIndex === index ? { ...addon, ...patch } : addon)));
  }

  async function save() {
    if (!categoryId) {
      setError(c.product.selectCategory);
      return;
    }
    if (!name.trim()) {
      setError(c.product.nameRequired);
      return;
    }
    if (!description.trim()) {
      setError(copy.descriptionRequired);
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
    if (!parsedAddons.value) {
      setError(parsedAddons.error);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let nextImageUrl = imageUrl.trim() || null;
      let nextImagePublicId = product?.imagePublicId ?? null;
      if (selectedImage) {
        const uploaded = await uploadProductImage(user, selectedImage);
        nextImageUrl = uploaded.imageUrl;
        nextImagePublicId = uploaded.imagePublicId;
      } else if (product && nextImageUrl !== product.imageUrl) {
        nextImagePublicId = null;
      }

      const input = {
        categoryId,
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        imageUrl: nextImageUrl,
        imagePublicId: nextImagePublicId,
        stockQuantity: stockQuantity.trim() ? Number(stockQuantity) : null,
        isAvailable: stockQuantity.trim() === "0" ? false : isAvailable,
        isActive,
        sortOrder: parsedSortOrder,
        addons: parsedAddons.value,
      };

      if (mode === "edit" && product) {
        await updateProduct(user, outletId, product.id, input);
        router.back();
      } else {
        await createProduct(user, outletId, input);
        router.replace({ pathname: "/menu", params: { outletId, outletName: outletName ?? "" } });
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  const previewUri = selectedImage?.uri || imageUrl.trim() || null;

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>{copy.loading}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: Math.max(insets.bottom + 34, 46),
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.colors.background }}
    >
      <AppHeader title={mode === "edit" ? copy.editHeader : copy.createHeader} onBack={() => router.back()} />

      <View className="mt-7">
        <Text className="text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>
          {mode === "edit" ? copy.editTitle : copy.createTitle}
        </Text>
        <Text className="mt-1 text-[10px] leading-4" style={{ color: theme.colors.textMuted }}>{copy.subtitle}</Text>
        <Text className="mt-2 text-[9px] font-black" style={{ color: theme.colors.primary }}>
          {outletName || c.common.outletFallback}
        </Text>
      </View>

      <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surfaceAccent }}>
        <View className="flex-row items-center gap-2">
          <NitipIcon color={theme.colors.primary} name="image" size={16} />
          <Text className="text-[9px] font-black tracking-[1px]" style={{ color: theme.colors.primary }}>{c.product.photoTitle}</Text>
        </View>
        {previewUri ? (
          <Image
            source={{ uri: previewUri }}
            className="mt-4 w-full rounded-[20px]"
            style={{ aspectRatio: 1, backgroundColor: theme.colors.surface }}
          />
        ) : null}
        <Pressable
          className="mt-4 min-h-[46px] flex-row items-center justify-center rounded-[16px]"
          disabled={cloudinaryReady !== true || saving}
          onPress={() => void pickImage()}
          style={{ backgroundColor: theme.colors.surfaceRaised, opacity: cloudinaryReady === true && !saving ? 1 : 0.5 }}
        >
          <NitipIcon color={theme.colors.primary} name="image" size={15} />
          <Text className="ml-2 text-[10px] font-black" style={{ color: theme.colors.primary }}>
            {previewUri ? c.product.changePhoto : c.product.choosePhoto}
          </Text>
        </Pressable>
      </View>

      <View className="mt-3 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Field label={c.product.category}>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((category) => {
              const selected = category.id === categoryId;
              return (
                <Pressable
                  key={category.id}
                  className="rounded-full px-3 py-2.5"
                  onPress={() => setCategoryId(category.id)}
                  style={{ backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceRaised }}
                >
                  <Text className="text-[9px] font-black" style={{ color: selected ? theme.colors.onPrimary : theme.colors.text }}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label={c.product.name}>
          <TextInput value={name} onChangeText={setName} maxLength={120} placeholder={c.product.namePlaceholder} placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} />
        </Field>
        <Field label={c.product.description}>
          <TextInput value={description} onChangeText={setDescription} maxLength={500} multiline textAlignVertical="top" placeholder={copy.descriptionPlaceholder} placeholderTextColor={theme.colors.textMuted} className="min-h-[96px] rounded-[16px] px-4 py-3 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} />
        </Field>
        <Field label={c.product.price}>
          <TextInput value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="12000" placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} />
        </Field>
        <Field label={c.product.stock}>
          <TextInput value={stockQuantity} onChangeText={setStockQuantity} keyboardType="number-pad" placeholder={c.product.stockPlaceholder} placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} />
        </Field>
        <Field label={c.product.sort}>
          <TextInput value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} />
        </Field>

        {mode === "edit" ? (
          <View className="mt-4 flex-row gap-2">
            <Toggle label={copy.availability} valueLabel={isAvailable ? copy.available : copy.soldOut} value={isAvailable} onPress={() => setIsAvailable((current) => !current)} />
            <Toggle label={copy.visibility} valueLabel={isActive ? copy.visible : copy.hidden} value={isActive} onPress={() => setIsActive((current) => !current)} />
          </View>
        ) : null}
      </View>

      <View className="mt-3 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="text-[14px] font-black" style={{ color: theme.colors.text }}>{copy.addonsTitle}</Text>
        <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{copy.addonsDescription}</Text>

        <View className="mt-4 gap-3">
          {addons.map((addon, index) => (
            <View key={addon.id ?? `new-${index}`} className="rounded-[18px] p-3" style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <TextInput value={addon.name} onChangeText={(value) => updateAddon(index, { name: value })} maxLength={80} placeholder={copy.addonPlaceholder} placeholderTextColor={theme.colors.textMuted} className="min-h-[44px] rounded-[14px] px-3 text-[10px]" style={{ backgroundColor: theme.colors.surface, color: theme.colors.text }} />
              <View className="mt-2 flex-row gap-2">
                <TextInput value={addon.price} onChangeText={(value) => updateAddon(index, { price: value })} keyboardType="number-pad" placeholder={copy.addonPricePlaceholder} placeholderTextColor={theme.colors.textMuted} className="min-h-[44px] flex-1 rounded-[14px] px-3 text-[10px]" style={{ backgroundColor: theme.colors.surface, color: theme.colors.text }} />
                <Pressable className="min-h-[44px] min-w-[76px] items-center justify-center rounded-[14px] px-3" onPress={() => updateAddon(index, { isAvailable: !addon.isAvailable })} style={{ backgroundColor: addon.isAvailable ? theme.colors.surfaceAccent : theme.colors.surface }}>
                  <Text className="text-[9px] font-black" style={{ color: addon.isAvailable ? theme.colors.primary : theme.colors.textMuted }}>{addon.isAvailable ? copy.active : copy.inactive}</Text>
                </Pressable>
                <Pressable className="h-11 w-11 items-center justify-center rounded-[14px]" onPress={() => setAddons((current) => current.filter((_, addonIndex) => addonIndex !== index))} style={{ backgroundColor: theme.colors.dangerSurface }}>
                  <NitipIcon color={theme.colors.danger} name="trash" size={15} />
                </Pressable>
              </View>
              {addon.name.trim() && addon.price.trim() && Number.isFinite(Number(addon.price)) ? (
                <Text className="mt-2 text-[8px] font-extrabold" style={{ color: theme.colors.textMuted }}>
                  {addon.name.trim()} · +{formatRupiah(Number(addon.price))}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        <Pressable className="mt-4 min-h-[46px] flex-row items-center justify-center rounded-[16px]" onPress={addAddon} style={{ backgroundColor: theme.colors.surfaceAccent }}>
          <NitipIcon color={theme.colors.primary} name="plus" size={15} />
          <Text className="ml-2 text-[10px] font-black" style={{ color: theme.colors.primary }}>{copy.addAddon}</Text>
        </Pressable>
      </View>

      {error ? (
        <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
          <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
        </View>
      ) : null}

      <Pressable className="mt-5 min-h-[52px] flex-row items-center justify-center rounded-[18px]" disabled={saving || !categoryId} onPress={() => void save()} style={{ backgroundColor: theme.colors.primary, opacity: saving || !categoryId ? 0.5 : 1 }}>
        {saving ? <ActivityIndicator color="#FFFFFF" /> : <NitipIcon color="#FFFFFF" name="check" size={16} />}
        <Text className="ml-2 text-[11px] font-black text-white">
          {saving ? copy.saving : mode === "edit" ? copy.update : copy.save}
        </Text>
      </Pressable>
    </ScrollView>
  );

  function Field({ label, children }: { label: string; children: ReactNode }) {
    return <View className="mt-3"><Text className="mb-2 text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>{label}</Text>{children}</View>;
  }

  function Toggle({ label, valueLabel, value, onPress }: { label: string; valueLabel: string; value: boolean; onPress: () => void }) {
    return (
      <Pressable className="flex-1 rounded-[16px] p-3" onPress={onPress} style={{ backgroundColor: value ? theme.colors.surfaceAccent : theme.colors.surfaceRaised }}>
        <Text className="text-[8px] font-bold" style={{ color: theme.colors.textMuted }}>{label}</Text>
        <Text className="mt-1 text-[10px] font-black" style={{ color: value ? theme.colors.primary : theme.colors.text }}>{valueLabel}</Text>
      </Pressable>
    );
  }
}
