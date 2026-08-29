import type { NitipOrder, NitipOrderReviews, NitipReview } from "@nitip/domain/commerce";
import { useNitipLanguage } from "@nitip/i18n";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useNitipTheme } from "../hooks/useNitipTheme";
import { getOrderReviews, upsertDriverReview, upsertProductReview } from "../lib/api";

const COPY = {
  id: {
    title: "Ulasan",
    driver: "Driver",
    save: "Simpan",
    update: "Perbarui",
    placeholder: "Tulis ulasan (opsional)",
    choose: "Pilih 1–5 bintang",
    saved: "Tersimpan",
    loadError: "Ulasan belum bisa dimuat.",
    saveError: "Ulasan belum bisa disimpan.",
  },
  en: {
    title: "Reviews",
    driver: "Driver",
    save: "Save",
    update: "Update",
    placeholder: "Write a review (optional)",
    choose: "Choose 1–5 stars",
    saved: "Saved",
    loadError: "Reviews are unavailable.",
    saveError: "Review could not be saved.",
  },
} as const;

type DraftMap = Record<string, number>;
type CommentMap = Record<string, string>;
type ErrorMap = Record<string, string | null>;

export function OrderReviewSection({ order }: { order: NitipOrder }) {
  const { user } = useAuth();
  const { language } = useNitipLanguage();
  const theme = useNitipTheme();
  const copy = COPY[language];
  const [reviews, setReviews] = useState<NitipOrderReviews | null>(null);
  const [scores, setScores] = useState<DraftMap>({});
  const [comments, setComments] = useState<CommentMap>({});
  const [errors, setErrors] = useState<ErrorMap>({});
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const products = useMemo(() => {
    const map = new Map<string, { productId: string; name: string }>();
    for (const item of order.items) {
      if (!map.has(item.productId)) map.set(item.productId, { productId: item.productId, name: item.name });
    }
    return Array.from(map.values());
  }, [order.items]);

  useEffect(() => {
    if (!user || order.status !== "delivered") return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    getOrderReviews(user, order.id)
      .then((next) => {
        if (!active) return;
        setReviews(next);
        const nextScores: DraftMap = {};
        const nextComments: CommentMap = {};
        for (const review of next.products) {
          const key = `product:${review.targetId}`;
          nextScores[key] = review.score;
          nextComments[key] = review.comment ?? "";
        }
        if (next.driver?.review) {
          nextScores.driver = next.driver.review.score;
          nextComments.driver = next.driver.review.comment ?? "";
        }
        setScores(nextScores);
        setComments(nextComments);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : copy.loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [copy.loadError, order.id, order.status, user]);

  if (!user || order.status !== "delivered") return null;

  function existingProductReview(productId: string) {
    return reviews?.products.find((review) => review.targetId === productId) ?? null;
  }

  function updateStoredProduct(review: NitipReview) {
    setReviews((current) => {
      if (!current) return current;
      const exists = current.products.some((item) => item.targetId === review.targetId);
      return {
        ...current,
        products: exists
          ? current.products.map((item) => item.targetId === review.targetId ? review : item)
          : [...current.products, review],
      };
    });
  }

  async function saveProduct(productId: string) {
    const key = `product:${productId}`;
    const score = scores[key] ?? 0;
    if (score < 1 || score > 5) {
      setErrors((current) => ({ ...current, [key]: copy.choose }));
      return;
    }
    setSavingKey(key);
    setSavedKey(null);
    setErrors((current) => ({ ...current, [key]: null }));
    try {
      const review = await upsertProductReview(user, order.id, productId, {
        score,
        comment: comments[key]?.trim() || null,
      });
      updateStoredProduct(review);
      setSavedKey(key);
    } catch (error) {
      setErrors((current) => ({ ...current, [key]: error instanceof Error ? error.message : copy.saveError }));
    } finally {
      setSavingKey(null);
    }
  }

  async function saveDriver() {
    const key = "driver";
    const score = scores[key] ?? 0;
    if (score < 1 || score > 5) {
      setErrors((current) => ({ ...current, [key]: copy.choose }));
      return;
    }
    setSavingKey(key);
    setSavedKey(null);
    setErrors((current) => ({ ...current, [key]: null }));
    try {
      const review = await upsertDriverReview(user, order.id, {
        score,
        comment: comments[key]?.trim() || null,
      });
      setReviews((current) => current?.driver ? {
        ...current,
        driver: { ...current.driver, review },
      } : current);
      setSavedKey(key);
    } catch (error) {
      setErrors((current) => ({ ...current, [key]: error instanceof Error ? error.message : copy.saveError }));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{copy.title}</Text>

      {loading ? (
        <View style={[styles.state, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : loadError ? (
        <View style={[styles.state, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerSurface }]}>
          <Text style={[styles.message, { color: theme.colors.danger }]}>{loadError}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {products.map((product) => {
            const key = `product:${product.productId}`;
            return (
              <ReviewEditor
                existing={Boolean(existingProductReview(product.productId))}
                key={key}
                reviewKey={key}
                title={product.name}
                onSave={() => void saveProduct(product.productId)}
              />
            );
          })}

          {reviews?.driver ? (
            <ReviewEditor
              existing={Boolean(reviews.driver.review)}
              reviewKey="driver"
              title={`${copy.driver} · ${reviews.driver.driverName}`}
              onSave={() => void saveDriver()}
            />
          ) : null}
        </View>
      )}
    </View>
  );

  function ReviewEditor({
    reviewKey,
    title,
    existing,
    onSave,
  }: {
    reviewKey: string;
    title: string;
    existing: boolean;
    onSave: () => void;
  }) {
    const score = scores[reviewKey] ?? 0;
    const saving = savingKey === reviewKey;
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((value) => {
            const selected = value <= score;
            return (
              <Pressable
                accessibilityRole="button"
                key={value}
                onPress={() => {
                  setScores((current) => ({ ...current, [reviewKey]: value }));
                  setErrors((current) => ({ ...current, [reviewKey]: null }));
                  setSavedKey(null);
                }}
                style={[
                  styles.star,
                  {
                    backgroundColor: selected ? "#FFF3C4" : theme.colors.surfaceRaised,
                    borderColor: selected ? "#F4B400" : theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.starText, { color: selected ? "#F4B400" : theme.colors.textMuted }]}>★</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          maxLength={500}
          multiline
          onChangeText={(value) => {
            setComments((current) => ({ ...current, [reviewKey]: value }));
            setSavedKey(null);
          }}
          placeholder={copy.placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            { backgroundColor: theme.colors.surfaceRaised, borderColor: theme.colors.border, color: theme.colors.text },
          ]}
          textAlignVertical="top"
          value={comments[reviewKey] ?? ""}
        />
        {errors[reviewKey] ? <Text style={[styles.message, { color: theme.colors.danger }]}>{errors[reviewKey]}</Text> : null}
        {savedKey === reviewKey ? <Text style={[styles.message, { color: theme.colors.success }]}>{copy.saved}</Text> : null}
        <Pressable
          disabled={saving}
          onPress={onSave}
          style={[styles.button, { backgroundColor: theme.colors.primary, opacity: saving ? 0.55 : 1 }]}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{existing ? copy.update : copy.save}</Text>}
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: "900" },
  list: { gap: 10, marginTop: 12 },
  card: { borderRadius: 20, borderWidth: 1, padding: 14 },
  title: { fontSize: 11, fontWeight: "900" },
  stars: { flexDirection: "row", gap: 7, marginTop: 12 },
  star: { alignItems: "center", borderRadius: 12, borderWidth: 1, flex: 1, height: 40, justifyContent: "center" },
  starText: { fontSize: 20 },
  input: { borderRadius: 14, borderWidth: 1, fontSize: 10, lineHeight: 16, marginTop: 11, minHeight: 72, padding: 11 },
  button: { alignItems: "center", borderRadius: 14, justifyContent: "center", marginTop: 11, minHeight: 44 },
  buttonText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  state: { alignItems: "center", borderRadius: 20, borderWidth: 1, marginTop: 12, padding: 22 },
  message: { fontSize: 8, fontWeight: "800", lineHeight: 13, marginTop: 8 },
});
