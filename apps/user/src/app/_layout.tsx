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
      <StatusBar
        backgroundColor={theme.colors.background}
        style={resolvedMode === "dark" ? "light" : "dark"}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
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
