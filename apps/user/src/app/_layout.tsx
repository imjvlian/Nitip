import "../../global.css";

import { NitipI18nProvider } from "@nitip/i18n";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  BottomNavigation,
  BottomNavigationSuppressionProvider,
  type RootTab,
} from "../components/BottomNavigation";
import { AuthProvider } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import { UserThemeProvider, useUserTheme } from "../context/ThemeContext";

function AppStack() {
  const { resolvedMode, theme } = useUserTheme();
  const pathname = usePathname();

  const activeTab: RootTab | null =
    pathname === "/home"
      ? "home"
      : pathname === "/orders"
        ? "orders"
        : pathname === "/profile"
          ? "profile"
          : null;
  const statusBarStyle =
    pathname === "/home" || resolvedMode === "dark" ? "light" : "dark";

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <StatusBar animated style={statusBarStyle} />
      <View className="flex-1">
        <BottomNavigationSuppressionProvider>
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
            <Stack.Screen name="profile" options={{ animation: "fade" }} />
          </Stack>
        </BottomNavigationSuppressionProvider>
      </View>
      {activeTab ? <BottomNavigation active={activeTab} /> : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <NitipI18nProvider>
      <SafeAreaProvider>
        <UserThemeProvider>
          <AuthProvider>
            <CartProvider>
              <AppStack />
            </CartProvider>
          </AuthProvider>
        </UserThemeProvider>
      </SafeAreaProvider>
    </NitipI18nProvider>
  );
}
