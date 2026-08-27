import { Image, Text, View } from "react-native";

import { useNitipTheme } from "../hooks/useNitipTheme";

export function UserAvatar({
  label,
  photoUrl,
  size = 40,
}: {
  label: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const theme = useNitipTheme();
  const initial = label.trim().slice(0, 1).toUpperCase() || "N";

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: theme.colors.surface,
        borderRadius: size / 2,
        height: size,
        justifyContent: "center",
        overflow: "hidden",
        width: size,
      }}
    >
      {photoUrl ? (
        <Image
          resizeMode="cover"
          source={{ uri: photoUrl }}
          style={{ height: size, width: size }}
        />
      ) : (
        <Text
          style={{
            color: theme.colors.primary,
            fontSize: Math.max(11, Math.round(size * 0.28)),
            fontWeight: "900",
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}
