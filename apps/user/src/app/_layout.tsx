import "../../global.css";

import { NitipI18nProvider } from "@nitip/i18n";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import { UserThemeProvider, useUserTheme } from "../context/ThemeContext";

function AppStack() {
  const { resolvedMode, theme } = useUserTheme();

  return (
    <>
      <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
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
    </>
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
