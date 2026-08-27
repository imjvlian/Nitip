import "../../global.css";

import { NitipI18nProvider } from "@nitip/i18n";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BottomNavigation, type RootTab } from "../components/BottomNavigation";
import { AuthProvider } from "../context/AuthContext";
import { MerchantThemeProvider, useMerchantTheme } from "../context/ThemeContext";

function AppStack() {
  const { resolvedMode, theme } = useMerchantTheme();
  const pathname = usePathname();
  const activeTab: RootTab | null =
    pathname === "/home" ? "home" : pathname === "/orders" ? "orders" : pathname === "/settings" ? "settings" : null;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
      <View className="flex-1">
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: "slide_from_right",
            animationTypeForReplace: "push",
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
            animationMatchesGesture: true,
          }}
        >
          <Stack.Screen name="index" options={{ animation: "fade" }} />
          <Stack.Screen name="login" options={{ animation: "fade" }} />
          <Stack.Screen name="home" options={{ animation: "fade" }} />
          <Stack.Screen name="orders" options={{ animation: "fade" }} />
          <Stack.Screen name="settings" options={{ animation: "fade" }} />
        </Stack>
      </View>
      {activeTab ? <BottomNavigation active={activeTab} /> : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <NitipI18nProvider>
      <SafeAreaProvider>
        <MerchantThemeProvider>
          <AuthProvider>
            <AppStack />
          </AuthProvider>
        </MerchantThemeProvider>
      </SafeAreaProvider>
    </NitipI18nProvider>
  );
}
