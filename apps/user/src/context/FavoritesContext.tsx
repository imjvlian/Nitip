import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NitipCatalogOutlet, NitipProduct } from "@nitip/domain/catalog";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./AuthContext";

const STORAGE_PREFIX = "@nitip/favorite-products:";

export interface FavoriteProduct {
  id: string;
  outletId: string;
  outletName: string;
  businessName: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number;
}

type FavoritesContextValue = {
  favorites: FavoriteProduct[];
  ready: boolean;
  isProductFavorite: (productId: string) => boolean;
  toggleProduct: (outlet: NitipCatalogOutlet, product: NitipProduct) => void;
  removeProduct: (productId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [ready, setReady] = useState(false);

  const storageKey = user ? `${STORAGE_PREFIX}${user.uid}` : null;

  useEffect(() => {
    let active = true;
    setReady(false);
    setFavorites([]);

    if (!storageKey) {
      setReady(true);
      return () => {
        active = false;
      };
    }

    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!active || !value) return;
        const parsed = JSON.parse(value) as unknown;
        if (Array.isArray(parsed)) setFavorites(parsed as FavoriteProduct[]);
      })
      .catch(() => {
        if (active) setFavorites([]);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [storageKey]);

  const persist = useCallback(
    (updater: (current: FavoriteProduct[]) => FavoriteProduct[]) => {
      if (!storageKey) return;
      setFavorites((current) => {
        const next = updater(current);
        void AsyncStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey],
  );

  const isProductFavorite = useCallback(
    (productId: string) => favorites.some((item) => item.id === productId),
    [favorites],
  );

  const toggleProduct = useCallback(
    (outlet: NitipCatalogOutlet, product: NitipProduct) => {
      persist((current) => {
        const exists = current.some((item) => item.id === product.id);
        if (exists) return current.filter((item) => item.id !== product.id);

        const snapshot: FavoriteProduct = {
          id: product.id,
          outletId: outlet.id,
          outletName: outlet.name,
          businessName: outlet.businessName,
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          ratingAverage: product.ratingAverage ?? null,
          ratingCount: product.ratingCount ?? 0,
        };

        return [snapshot, ...current];
      });
    },
    [persist],
  );

  const removeProduct = useCallback(
    (productId: string) => persist((current) => current.filter((item) => item.id !== productId)),
    [persist],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ favorites, ready, isProductFavorite, toggleProduct, removeProduct }),
    [favorites, ready, isProductFavorite, toggleProduct, removeProduct],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites must be used inside FavoritesProvider");
  return value;
}
