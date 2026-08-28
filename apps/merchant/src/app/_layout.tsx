import "../../global.css";

import { NitipI18nProvider } from "@nitip/i18n";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AlertPopupProvider } from "../components/AlertPopupProvider";
import { BottomNavigation, type RootTab } from "../components/BottomNavigation";
import { AuthProvider } from "../context/AuthContext";
import { MerchantThemeProvider, useMerchantTheme } from "../context/ThemeContext";

const ROOT_TAB_CLEARANCE = 82;

function AppStack() {
  const { resolvedMode } = useMerchantTheme();
  const pathname = usePathname();
  const activeTab: RootTab | null =
    pathname === "/home"
      ? "home"
      : pathname === "/orders"
        ? "orders"
        : pathname === "/menu"
          ? "menu"
          : pathname === "/settings"
            ? "settings"
            : null;
  const screenBackground = resolvedMode === "dark" ? "#121318" : "#F2F3F5";

  return (
    <View style={{ backgroundColor: screenBackground, flex: 1 }}>
      <StatusBar animated style={resolvedMode === "dark" ? "light" : "dark"} />
      <View style={{ flex: 1, paddingBottom: activeTab ? ROOT_TAB_CLEARANCE : 0 }}>
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
          <Stack.Screen name="menu" options={{ animation: "fade" }} />
          <Stack.Screen name="settings" options={{ animation: "fade" }} />
        </Stack>
      </View>

      {activeTab ? (
        <View
          pointerEvents="box-none"
          style={{ bottom: 0, left: 0, position: "absolute", right: 0, zIndex: 50 }}
        >
          <BottomNavigation active={activeTab} />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <NitipI18nProvider>
      <SafeAreaProvider>
        <MerchantThemeProvider>
          <AlertPopupProvider>
            <AuthProvider>
              <AppStack />
            </AuthProvider>
          </AlertPopupProvider>
        </MerchantThemeProvider>
      </SafeAreaProvider>
    </NitipI18nProvider>
  );
}
