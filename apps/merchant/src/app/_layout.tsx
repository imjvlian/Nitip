import "../../global.css";

import { NitipI18nProvider } from "@nitip/i18n";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <NitipI18nProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </NitipI18nProvider>
  );
}
