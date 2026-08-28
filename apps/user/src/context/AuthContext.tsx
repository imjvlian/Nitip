import { useNitipLanguage } from "@nitip/i18n";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert } from "react-native";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { firebaseAuth, firebaseConfigured } from "../lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function requireAuth() {
  if (!firebaseAuth) {
    throw new Error("Firebase Authentication belum dikonfigurasi");
  }

  return firebaseAuth;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { language } = useNitipLanguage();
  const [user, setUser] = useState<User | null>(firebaseAuth?.currentUser ?? null);
  const [loading, setLoading] = useState(Boolean(firebaseAuth));

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: firebaseConfigured,
      async signIn(email, password) {
        await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
      },
      async signUp(displayName, email, password) {
        const credential = await createUserWithEmailAndPassword(
          requireAuth(),
          email.trim(),
          password,
        );

        const trimmedName = displayName.trim();
        if (trimmedName) {
          await updateProfile(credential.user, { displayName: trimmedName });
        }
      },
      async resetPassword(email) {
        const normalizedEmail = email.trim();
        if (!normalizedEmail) throw new Error(language === "id" ? "Email wajib diisi" : "Email is required");
        await sendPasswordResetEmail(requireAuth(), normalizedEmail);
      },
      async signOut() {
        const auth = requireAuth();
        await new Promise<void>((resolve, reject) => {
          Alert.alert(
            language === "id" ? "Keluar dari akun?" : "Sign out?",
            language === "id"
              ? "Sesi akun Nitip di perangkat ini akan diakhiri."
              : "Your Nitip session on this device will be ended.",
            [
              { text: language === "id" ? "Batal" : "Cancel", style: "cancel", onPress: resolve },
              {
                text: language === "id" ? "Keluar" : "Sign out",
                style: "destructive",
                onPress: () => { void firebaseSignOut(auth).then(() => resolve()).catch(reject); },
              },
            ],
          );
        });
      },
    }),
    [language, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
