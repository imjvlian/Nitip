import type { NitipUserProfile } from "@nitip/domain";
import { useNitipLanguage, useNitipTranslation } from "@nitip/i18n";
import * as ImagePicker from "expo-image-picker";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { NitipIcon } from "../../components/NitipIcon";
import { UserAvatar } from "../../components/UserAvatar";
import { SETTINGS_COPY } from "../../constants/settingsCopy";
import { useAuth } from "../../context/AuthContext";
import { useNitipTheme } from "../../hooks/useNitipTheme";
import {
  getMe,
  updateMe,
  updateProfilePhoto,
  uploadProfilePhoto,
} from "../../lib/api";

const PHOTO_COPY = {
  id: {
    photo: "Foto profil",
    photoDescription: "Foto berbentuk persegi akan dipotong menjadi avatar. Maksimal 5 MB.",
    changePhoto: "Ganti foto",
    addPhoto: "Tambah foto",
    removePhoto: "Hapus foto",
    uploading: "Mengunggah...",
    permission: "Izin akses galeri diperlukan untuk memilih foto profil.",
    tooLarge: "Ukuran foto maksimal 5 MB.",
    uploadError: "Gagal mengunggah foto profil.",
    removeError: "Gagal menghapus foto profil.",
  },
  en: {
    photo: "Profile photo",
    photoDescription: "Square photos are cropped into an avatar. Maximum size is 5 MB.",
    changePhoto: "Change photo",
    addPhoto: "Add photo",
    removePhoto: "Remove photo",
    uploading: "Uploading...",
    permission: "Photo library permission is required to choose a profile photo.",
    tooLarge: "Profile photo size is limited to 5 MB.",
    uploadError: "Failed to upload profile photo.",
    removeError: "Failed to remove profile photo.",
  },
} as const;

export default function AccountSettingsScreen() {
  const { t } = useNitipTranslation();
  const { language } = useNitipLanguage();
  const copy = SETTINGS_COPY[language];
  const photoCopy = PHOTO_COPY[language];
  const { user } = useAuth();
  const theme = useNitipTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<NitipUserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setError(null);
    getMe(user)
      .then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setDisplayName(nextProfile.displayName ?? "");
        setPhoneNumber(nextProfile.phoneNumber ?? "");
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : t("profile.loadError"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t, user]);

  if (!user) return <Redirect href="/login" />;
  const authenticatedUser = user;
  const avatarLabel = profile?.displayName || profile?.email || authenticatedUser.displayName || authenticatedUser.email || "Nitip";

  async function pickPhoto() {
    if (uploadingPhoto) return;
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(photoCopy.permission);
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
      if (asset.fileSize != null && asset.fileSize > 5 * 1024 * 1024) {
        setError(photoCopy.tooLarge);
        return;
      }
      setUploadingPhoto(true);
      const photoUrl = await uploadProfilePhoto(authenticatedUser, { uri: asset.uri, mimeType: asset.mimeType });
      setProfile(await updateProfilePhoto(authenticatedUser, photoUrl));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : photoCopy.uploadError);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto() {
    if (uploadingPhoto || !profile?.photoUrl) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      setProfile(await updateProfilePhoto(authenticatedUser, null));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : photoCopy.removeError);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const nextProfile = await updateMe(authenticatedUser, {
        displayName: displayName.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
      });
      setProfile(nextProfile);
      setDisplayName(nextProfile.displayName ?? "");
      setPhoneNumber(nextProfile.phoneNumber ?? "");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t("profile.saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: insets.top + 10,
          paddingBottom: Math.max(insets.bottom + 28, 40),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AppHeader title={copy.accountInformation} />

        {loading ? (
          <View className="mt-5 items-center rounded-[22px] p-6" style={{ backgroundColor: theme.colors.surface }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text className="mt-3 text-[10px]" style={{ color: theme.colors.textMuted }}>
              {t("profile.loading")}
            </Text>
          </View>
        ) : (
          <View className="mt-5 rounded-[22px] p-4" style={{ backgroundColor: theme.colors.surface }}>
            <View className="items-center py-2">
              <View className="relative">
                <UserAvatar label={avatarLabel} photoUrl={profile?.photoUrl} size={92} />
                <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: theme.colors.primary }}>
                  {uploadingPhoto ? <ActivityIndicator color="#FFFFFF" size="small" /> : <NitipIcon color="#FFFFFF" name="camera" size={15} />}
                </View>
              </View>
              <Text className="mt-4 text-xs font-black" style={{ color: theme.colors.text }}>{photoCopy.photo}</Text>
              <Text className="mt-1 max-w-[270px] text-center text-[9px] leading-4" style={{ color: theme.colors.textMuted }}>
                {photoCopy.photoDescription}
              </Text>
              <View className="mt-4 flex-row items-center gap-2">
                <Pressable
                  className="min-h-[42px] flex-row items-center justify-center gap-2 rounded-[14px] px-4"
                  disabled={uploadingPhoto}
                  onPress={() => void pickPhoto()}
                  style={{ backgroundColor: theme.colors.primary, opacity: uploadingPhoto ? 0.55 : 1 }}
                >
                  <NitipIcon color="#FFFFFF" name="camera" size={15} />
                  <Text className="text-[10px] font-black text-white">
                    {uploadingPhoto ? photoCopy.uploading : profile?.photoUrl ? photoCopy.changePhoto : photoCopy.addPhoto}
                  </Text>
                </Pressable>
                {profile?.photoUrl ? (
                  <Pressable
                    className="min-h-[42px] items-center justify-center rounded-[14px] px-4"
                    disabled={uploadingPhoto}
                    onPress={() => void removePhoto()}
                    style={{ backgroundColor: theme.colors.dangerSurface, opacity: uploadingPhoto ? 0.55 : 1 }}
                  >
                    <Text className="text-[10px] font-black" style={{ color: theme.colors.danger }}>{photoCopy.removePhoto}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View className="my-5 h-px" style={{ backgroundColor: theme.colors.border }} />

            <Text className="mb-2 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>{t("common.email")}</Text>
            <View className="rounded-[16px] px-4 py-3.5" style={{ backgroundColor: theme.colors.surfaceRaised }}>
              <Text className="text-xs" style={{ color: theme.colors.textMuted }}>{profile?.email ?? authenticatedUser.email ?? "-"}</Text>
            </View>

            <Text className="mb-2 mt-4 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>{t("profile.displayName")}</Text>
            <TextInput
              className="rounded-[16px] px-4 py-3.5 text-sm"
              maxLength={80}
              onChangeText={setDisplayName}
              placeholder={t("profile.displayNamePlaceholder")}
              placeholderTextColor={theme.colors.textMuted}
              style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              value={displayName}
            />

            <Text className="mb-2 mt-4 text-[10px] font-extrabold" style={{ color: theme.colors.textMuted }}>{t("profile.phone")}</Text>
            <TextInput
              className="rounded-[16px] px-4 py-3.5 text-sm"
              keyboardType="phone-pad"
              maxLength={30}
              onChangeText={setPhoneNumber}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={theme.colors.textMuted}
              style={{ backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text }}
              value={phoneNumber}
            />

            {error ? (
              <View className="mt-4 rounded-[16px] p-3" style={{ backgroundColor: theme.colors.dangerSurface }}>
                <Text className="text-[10px] leading-4" style={{ color: theme.colors.danger }}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              className="mt-5 min-h-[50px] items-center justify-center rounded-[16px]"
              disabled={saving || uploadingPhoto}
              onPress={() => void save()}
              style={{ backgroundColor: theme.colors.primary, opacity: saving || uploadingPhoto ? 0.55 : 1 }}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-xs font-black text-white">{t("profile.saveProfile")}</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
