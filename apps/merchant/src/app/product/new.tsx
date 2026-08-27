import type { NitipCategory } from "@nitip/domain/catalog";
import { useNitipLanguage } from "@nitip/i18n";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { NitipIcon } from "../../components/NitipIcon";
import { getMerchantCopy } from "../../constants/merchantCopy";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import { createProduct, getProductUploadSignature, listCategories, uploadProductImage } from "../../lib/api";

type SelectedImage = { uri: string; fileName?: string | null; mimeType?: string | null; fileSize?: number };

export default function NewProductScreen() {
  const { outletId, outletName } = useLocalSearchParams<{ outletId: string; outletName?: string }>();
  const { language } = useNitipLanguage();
  const c = getMerchantCopy(language);
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
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
      .then((items) => { const active = items.filter((item) => item.isActive); setCategories(active); setCategoryId((current) => current || active[0]?.id || ""); })
      .catch((nextError: unknown) => setError(nextError instanceof Error ? nextError.message : c.product.categoryLoadError));
    void getProductUploadSignature(user).then(() => setCloudinaryReady(true)).catch(() => setCloudinaryReady(false));
  }, [c.product.categoryLoadError, outletId, user]);

  if (!user) return <Redirect href="/login" />;

  async function pickImage() {
    if (!cloudinaryReady) { setError(c.product.cloudinaryRequired); return; }
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError(c.product.galleryPermission); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.fileSize != null && asset.fileSize > 10 * 1024 * 1024) { setError(c.product.maxPhoto); return; }
      setSelectedImage({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType, fileSize: asset.fileSize });
      setImageUrl("");
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : c.product.galleryError); }
  }

  async function save() {
    if (!categoryId) { setError(c.product.selectCategory); return; }
    if (!name.trim()) { setError(c.product.nameRequired); return; }
    if (!price.trim() || !Number.isInteger(Number(price)) || Number(price) < 0) { setError(c.product.priceInvalid); return; }
    if (stockQuantity.trim() && (!Number.isInteger(Number(stockQuantity)) || Number(stockQuantity) < 0)) { setError(c.product.stockInvalid); return; }
    setSaving(true); setError(null);
    try {
      let uploadedImage: { imageUrl: string | null; imagePublicId: string | null } = { imageUrl: imageUrl.trim() || null, imagePublicId: null };
      if (selectedImage) uploadedImage = await uploadProductImage(user, selectedImage);
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
      router.replace({ pathname: "/menu", params: { outletId, outletName: outletName ?? "" } });
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : c.product.saveError); }
    finally { setSaving(false); }
  }

  const previewUri = selectedImage?.uri || imageUrl.trim() || null;

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: insets.top + 10, paddingBottom: Math.max(insets.bottom + 30, 42) }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ backgroundColor: theme.colors.background }}>
      <AppHeader title={c.product.eyebrow} onBack={() => router.back()} />
      <View className="mt-7"><Text className="text-[9px] font-black tracking-[1.2px]" style={{ color: theme.colors.primary }}>{c.product.eyebrow}</Text><Text className="mt-2 text-[28px] font-black tracking-tighter" style={{ color: theme.colors.text }}>{c.product.title}</Text><Text className="mt-1 text-[10px]" style={{ color: theme.colors.textMuted }}>{outletName || c.common.outletFallback}</Text></View>

      <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surfaceAccent }}>
        <View className="flex-row items-center gap-2"><NitipIcon color={theme.colors.primary} name="image" size={16} /><Text className="text-[9px] font-black tracking-[1px]" style={{ color: theme.colors.primary }}>{c.product.photoTitle}</Text></View>
        <Text className="mt-2 text-[11px] font-black" style={{ color: theme.colors.text }}>{cloudinaryReady === null ? c.product.checkingCloudinary : cloudinaryReady ? c.product.cloudinaryReady : c.product.cloudinaryMissing}</Text>
        <Text className="mt-1 text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>{cloudinaryReady ? c.product.photoReadyDescription : c.product.photoMissingDescription}</Text>
        {previewUri ? <View className="mt-4"><Image source={{ uri: previewUri }} className="w-full rounded-[20px]" style={{ aspectRatio: 1, backgroundColor: theme.colors.surface }} /><Pressable className="mt-2 self-start" onPress={() => { setSelectedImage(null); setImageUrl(""); }}><Text className="text-[9px] font-black" style={{ color: theme.colors.danger }}>{c.product.removePhoto}</Text></Pressable></View> : null}
        <Pressable className="mt-4 min-h-[46px] flex-row items-center justify-center rounded-[16px]" disabled={cloudinaryReady !== true || saving} onPress={() => void pickImage()} style={{ backgroundColor: theme.colors.surfaceRaised, opacity: cloudinaryReady !== true || saving ? 0.5 : 1 }}><NitipIcon color={theme.colors.primary} name="image" size={15} /><Text className="ml-2 text-[10px] font-black" style={{ color: theme.colors.primary }}>{selectedImage ? c.product.changePhoto : c.product.choosePhoto}</Text></Pressable>
      </View>

      <View className="mt-3 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
        <Text className="mb-2 mt-1 text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>{c.product.category}</Text>
        {categories.length === 0 ? <View className="rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}><Text className="text-[9px] leading-4" style={{ color: theme.colors.danger }}>{c.product.noCategory}</Text></View> : <View className="flex-row flex-wrap gap-2">{categories.map((category) => { const selected = category.id === categoryId; return <Pressable key={category.id} onPress={() => setCategoryId(category.id)} className="rounded-full px-3 py-2.5" style={{ backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceRaised }}><Text className="text-[9px] font-black" style={{ color: selected ? theme.colors.onPrimary : theme.colors.text }}>{category.name}</Text></Pressable>; })}</View>}
        <Field label={c.product.name}><TextInput value={name} onChangeText={setName} placeholder={c.product.namePlaceholder} placeholderTextColor={theme.colors.textMuted} maxLength={120} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} /></Field>
        <Field label={c.product.description}><TextInput value={description} onChangeText={setDescription} placeholder={c.product.optional} placeholderTextColor={theme.colors.textMuted} maxLength={500} multiline textAlignVertical="top" className="min-h-[84px] rounded-[16px] px-4 py-3 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} /></Field>
        <Field label={c.product.price}><TextInput value={price} onChangeText={setPrice} keyboardType="number-pad" placeholder="12000" placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} /></Field>
        <Field label={c.product.stock}><TextInput value={stockQuantity} onChangeText={setStockQuantity} keyboardType="number-pad" placeholder={c.product.stockPlaceholder} placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} /></Field>
        {!selectedImage ? <Field label={c.product.imageUrl}><TextInput value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" placeholder="https://res.cloudinary.com/..." placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} /></Field> : null}
        <Field label={c.product.sort}><TextInput value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" placeholder="0" placeholderTextColor={theme.colors.textMuted} className="min-h-[48px] rounded-[16px] px-4 text-[11px]" style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }} /></Field>
        {error ? <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}><Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text></View> : null}
        <Pressable className="mt-5 min-h-[50px] flex-row items-center justify-center rounded-[16px]" disabled={saving || !categoryId} onPress={() => void save()} style={{ backgroundColor: theme.colors.primary, opacity: saving || !categoryId ? 0.5 : 1 }}>{saving && selectedImage ? <ActivityIndicator color="#FFFFFF" /> : null}<Text className={`${saving && selectedImage ? "ml-2" : ""} text-[11px] font-black text-white`}>{saving ? selectedImage ? c.product.uploading : c.common.saving : c.product.save}</Text></Pressable>
      </View>
    </ScrollView>
  );

  function Field({ label, children }: { label: string; children: ReactNode }) { return <View className="mt-3"><Text className="mb-2 text-[9px] font-extrabold" style={{ color: theme.colors.textMuted }}>{label}</Text>{children}</View>; }
}
