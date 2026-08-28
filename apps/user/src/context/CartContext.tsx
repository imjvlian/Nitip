import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NitipProduct } from "@nitip/domain/catalog";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "./AuthContext";

export interface CartOutlet {
  id: string;
  name: string;
  businessName: string;
}

export interface CartLine {
  product: NitipProduct;
  quantity: number;
}

interface CartState {
  outlet: CartOutlet | null;
  items: CartLine[];
}

type AddItemResult = "added" | "different_outlet";

interface CartContextValue extends CartState {
  ready: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (outlet: CartOutlet, product: NitipProduct, quantity?: number) => AddItemResult;
  replaceWithItem: (outlet: CartOutlet, product: NitipProduct, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const EMPTY_CART: CartState = { outlet: null, items: [] };
const CartContext = createContext<CartContextValue | null>(null);

function storageKey(uid: string) {
  return `nitip:cart:${uid}`;
}

function parseStoredCart(value: string | null): CartState {
  if (!value) return EMPTY_CART;
  try {
    const parsed = JSON.parse(value) as Partial<CartState>;
    if (!parsed.outlet || !Array.isArray(parsed.items)) return EMPTY_CART;
    return {
      outlet: parsed.outlet,
      items: parsed.items.filter(
        (item): item is CartLine =>
          Boolean(item?.product?.id) &&
          Number.isInteger(item?.quantity) &&
          Number(item.quantity) > 0,
      ),
    };
  } catch {
    return EMPTY_CART;
  }
}

function clampQuantity(product: NitipProduct, quantity: number) {
  const stockLimit = product.stockQuantity ?? 99;
  return Math.max(1, Math.min(99, stockLimit, quantity));
}

function normalizeRequestedQuantity(product: NitipProduct, quantity: number | undefined) {
  const requested = Number.isFinite(quantity) ? Math.trunc(quantity as number) : 1;
  return clampQuantity(product, Math.max(1, requested));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartState>(EMPTY_CART);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);

    if (!user) {
      setCart(EMPTY_CART);
      setReady(true);
      return () => {
        active = false;
      };
    }

    AsyncStorage.getItem(storageKey(user.uid))
      .then((value) => {
        if (active) setCart(parseStoredCart(value));
      })
      .catch(() => {
        if (active) setCart(EMPTY_CART);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user || !ready) return;
    void AsyncStorage.setItem(storageKey(user.uid), JSON.stringify(cart));
  }, [cart, ready, user?.uid]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0,
    );

    return {
      ...cart,
      ready,
      itemCount,
      subtotal,
      addItem(outlet, product, quantity = 1) {
        if (cart.outlet && cart.outlet.id !== outlet.id && cart.items.length > 0) {
          return "different_outlet";
        }

        const requestedQuantity = normalizeRequestedQuantity(product, quantity);

        setCart((current) => {
          const existing = current.items.find((item) => item.product.id === product.id);
          if (existing) {
            return {
              outlet,
              items: current.items.map((item) =>
                item.product.id === product.id
                  ? {
                      ...item,
                      product,
                      quantity: clampQuantity(product, item.quantity + requestedQuantity),
                    }
                  : item,
              ),
            };
          }
          return {
            outlet,
            items: [...current.items, { product, quantity: requestedQuantity }],
          };
        });
        return "added";
      },
      replaceWithItem(outlet, product, quantity = 1) {
        setCart({
          outlet,
          items: [{ product, quantity: normalizeRequestedQuantity(product, quantity) }],
        });
      },
      setQuantity(productId, quantity) {
        setCart((current) => {
          if (quantity <= 0) {
            const items = current.items.filter((item) => item.product.id !== productId);
            return items.length === 0 ? EMPTY_CART : { ...current, items };
          }

          return {
            ...current,
            items: current.items.map((item) =>
              item.product.id === productId
                ? {
                    ...item,
                    quantity: clampQuantity(item.product, quantity),
                  }
                : item,
            ),
          };
        });
      },
      removeItem(productId) {
        setCart((current) => {
          const items = current.items.filter((item) => item.product.id !== productId);
          return items.length === 0 ? EMPTY_CART : { ...current, items };
        });
      },
      clearCart() {
        setCart(EMPTY_CART);
      },
    };
  }, [cart, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
