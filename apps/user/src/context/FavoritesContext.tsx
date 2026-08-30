import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NitipCatalogOutlet, NitipProduct } from "@nitip/domain/catalog";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  addFavoriteProduct,
  FavoritesApiError,
  listFavoriteProducts,
  removeFavoriteProduct,
  type FavoriteProductRecord,
} from "../lib/favorites";
import { useAuth } from "./AuthContext";

const STORAGE_PREFIX = "@nitip/favorite-products:";
const MIGRATION_PREFIX = "@nitip/favorite-products-migrated:";

export type FavoriteProduct = FavoriteProductRecord;

type FavoritesContextValue = {
  favorites: FavoriteProduct[];
  ready: boolean;
  isProductFavorite: (productId: string) => boolean;
  toggleProduct: (outlet: NitipCatalogOutlet, product: NitipProduct) => void;
  removeProduct: (productId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readCachedFavorites(value: string | null): FavoriteProduct[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as FavoriteProduct[]) : [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [ready, setReady] = useState(false);
  const pendingProducts = useRef(new Set<string>());

  const storageKey = user ? `${STORAGE_PREFIX}${user.uid}` : null;
  const migrationKey = user ? `${MIGRATION_PREFIX}${user.uid}` : null;

  const updateLocal = useCallback(
    (updater: (current: FavoriteProduct[]) => FavoriteProduct[]) => {
      setFavorites((current) => {
        const next = updater(current);
        if (storageKey) void AsyncStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey],
  );

  useEffect(() => {
    let active = true;
    setReady(false);
    setFavorites([]);
    pendingProducts.current.clear();

    if (!user || !storageKey || !migrationKey) {
      setReady(true);
      return () => {
        active = false;
      };
    }

    void (async () => {
      const cached = readCachedFavorites(await AsyncStorage.getItem(storageKey));
      if (active && cached.length > 0) setFavorites(cached);

      try {
        let serverFavorites = await listFavoriteProducts(user);
        const migrated = await AsyncStorage.getItem(migrationKey);

        if (!migrated) {
          for (const item of cached) {
            try {
              await addFavoriteProduct(user, item.id);
            } catch (error) {
              if (error instanceof FavoritesApiError && error.status === 404) continue;
              throw error;
            }
          }
          if (cached.length > 0) serverFavorites = await listFavoriteProducts(user);
          await AsyncStorage.setItem(migrationKey, "1");
        }

        if (!active) return;
        setFavorites(serverFavorites);
        await AsyncStorage.setItem(storageKey, JSON.stringify(serverFavorites));
      } catch {
        if (active) setFavorites(cached);
      } finally {
        if (active) setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [migrationKey, storageKey, user]);

  const isProductFavorite = useCallback(
    (productId: string) => favorites.some((item) => item.id === productId),
    [favorites],
  );

  const removeProduct = useCallback(
    (productId: string) => {
      if (!user || pendingProducts.current.has(productId)) return;
      const existing = favorites.find((item) => item.id === productId);
      if (!existing) return;

      pendingProducts.current.add(productId);
      updateLocal((current) => current.filter((item) => item.id !== productId));

      void removeFavoriteProduct(user, productId)
        .catch(() => {
          updateLocal((current) =>
            current.some((item) => item.id === productId) ? current : [existing, ...current],
          );
        })
        .finally(() => {
          pendingProducts.current.delete(productId);
        });
    },
    [favorites, updateLocal, user],
  );

  const toggleProduct = useCallback(
    (outlet: NitipCatalogOutlet, product: NitipProduct) => {
      if (!user || pendingProducts.current.has(product.id)) return;
      const existing = favorites.find((item) => item.id === product.id);
      if (existing) {
        removeProduct(product.id);
        return;
      }

      const optimistic: FavoriteProduct = {
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
        createdAt: new Date().toISOString(),
      };

      pendingProducts.current.add(product.id);
      updateLocal((current) => [optimistic, ...current.filter((item) => item.id !== product.id)]);

      void addFavoriteProduct(user, product.id)
        .then((saved) => {
          updateLocal((current) => [saved, ...current.filter((item) => item.id !== product.id)]);
        })
        .catch(() => {
          updateLocal((current) => current.filter((item) => item.id !== product.id));
        })
        .finally(() => {
          pendingProducts.current.delete(product.id);
        });
    },
    [favorites, removeProduct, updateLocal, user],
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
