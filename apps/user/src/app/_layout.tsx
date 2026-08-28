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
        : pathname === "/promos"
          ? "promos"
          : pathname === "/cart"
            ? "cart"
            : pathname === "/profile"
              ? "profile"
              : null;
  const statusBarStyle = pathname === "/home" || resolvedMode === "dark" ? "light" : "dark";
  const preserveExistingPresentation =
    pathname === "/home" || pathname.startsWith("/settings");
  const screenBackground = preserveExistingPresentation
    ? theme.colors.background
    : resolvedMode === "dark"
      ? "#121318"
      : "#F3F3F0";
  const navigationUnderlay =
    resolvedMode === "dark"
      ? screenBackground
      : activeTab === "home"
        ? "#EEF0F4"
        : screenBackground;

  return (
    <View
      style={{
        alignSelf: "stretch",
        backgroundColor: screenBackground,
        flex: 1,
        width: "100%",
      }}
    >
      <StatusBar animated style={statusBarStyle} />

      <View style={{ alignSelf: "stretch", flex: 1, width: "100%" }}>
        <BottomNavigationSuppressionProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: screenBackground },
              animation: "slide_from_right",
              animationTypeForReplace: "push",
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
              animationMatchesGesture: true,
              navigationBarHidden: false,
            }}
          >
            <Stack.Screen name="index" options={{ animation: "fade" }} />
            <Stack.Screen name="login" options={{ animation: "fade" }} />
            <Stack.Screen name="home" options={{ animation: "fade" }} />
            <Stack.Screen name="orders" options={{ animation: "fade" }} />
            <Stack.Screen name="promos" options={{ animation: "fade" }} />
            <Stack.Screen name="cart" options={{ animation: "fade" }} />
            <Stack.Screen name="profile" options={{ animation: "fade" }} />
            <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
          </Stack>
        </BottomNavigationSuppressionProvider>
      </View>

      {activeTab ? (
        <View
          style={{
            alignSelf: "stretch",
            backgroundColor: navigationUnderlay,
            flexShrink: 0,
            width: "100%",
          }}
        >
          <BottomNavigation active={activeTab} root />
        </View>
      ) : null}
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
