import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";

export default function IndexScreen() {
  const { loading, user } = useAuth();
  const theme = useNitipTheme();

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return <Redirect href={user ? "/home" : "/login"} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
