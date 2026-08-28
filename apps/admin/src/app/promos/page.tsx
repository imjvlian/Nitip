import type { NitipPromotion } from "@nitip/domain/catalog";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const TOKEN_COOKIE = "nitip_admin_token";

const colors = {
  background: "#F7F8FB",
  surface: "#FFFFFF",
  text: "#111318",
  primary: "#2448F5",
  muted: "#7C8190",
  border: "#E7E9EE",
  accent: "#EEF1FF",
  success: "#178A4A",
  danger: "#B42318",
} as const;

function apiUrl() {
  return (process.env.NITIP_API_URL ?? "http://localhost:3001").replace(/\/+$/, "");
}

function optionalIso(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function createPromotion(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) redirect("/");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect("/promos?error=create");

  const priorityRaw = Number(formData.get("priority") ?? 0);
  const body = {
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    ctaLabel: String(formData.get("ctaLabel") ?? "").trim() || null,
    imageUrl: String(formData.get("imageUrl") ?? "").trim() || null,
    outletId: String(formData.get("outletId") ?? "").trim() || null,
    startsAt: optionalIso(formData.get("startsAt")),
    endsAt: optionalIso(formData.get("endsAt")),
    priority: Number.isInteger(priorityRaw) ? priorityRaw : 0,
    isActive: formData.get("isActive") === "on",
  };

  const response = await fetch(`${apiUrl()}/admin/promotions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401 || response.status === 403) redirect("/");
  if (!response.ok) redirect("/promos?error=create");
  revalidatePath("/promos");
}

async function togglePromotion(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) redirect("/");

  const id = String(formData.get("id") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "") === "true";
  if (!id) redirect("/promos?error=toggle");

  const response = await fetch(
    `${apiUrl()}/admin/promotions/${encodeURIComponent(id)}/active`,
    {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isActive }),
    },
  );

  if (response.status === 401 || response.status === 403) redirect("/");
  if (!response.ok) redirect("/promos?error=toggle");
  revalidatePath("/promos");
}

async function loadPromotions(token: string): Promise<NitipPromotion[] | null> {
  try {
    const response = await fetch(`${apiUrl()}/admin/promotions`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) return [];
    const body = (await response.json()) as { data?: NitipPromotion[] };
    return body.data ?? [];
  } catch {
    return [];
  }
}

function formatSchedule(value: string | null) {
  return value
    ? new Date(value).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Tanpa batas";
}

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: "11px 12px",
  marginTop: 6,
  fontSize: 14,
  background: colors.surface,
  color: colors.text,
};

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) redirect("/");

  const promotions = await loadPromotions(token);
  if (!promotions) redirect("/");

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 24px 72px", color: colors.text }}>
      <section>
        <div style={{ color: colors.primary, fontWeight: 900, fontSize: 11, letterSpacing: 1.3 }}>
          PROMOTION CAMPAIGNS
        </div>
        <h1 style={{ fontSize: 36, letterSpacing: -1.3, margin: "7px 0 0" }}>Promo Nitip.</h1>
        <p style={{ color: colors.muted, lineHeight: 1.6, maxWidth: 720 }}>
          Buat campaign yang tampil di Beranda dan tab Promo aplikasi User. Campaign ini belum memotong total checkout; diskon dan voucher akan memakai pricing engine terpisah.
        </p>
      </section>

      {params.error ? (
        <div style={{ marginTop: 18, padding: 13, borderRadius: 12, background: "#FFF1F0", color: colors.danger }}>
          Promo tidak dapat diproses. Periksa data, periode tayang, dan koneksi API.
        </div>
      ) : null}

      <section
        style={{
          marginTop: 28,
          padding: 22,
          borderRadius: 20,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 22 }}>Buat promo</h2>
        <form action={createPromotion} style={{ display: "grid", gap: 14, marginTop: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: colors.muted }}>
            Judul promo *
            <input name="title" required maxLength={120} placeholder="Contoh: Menu makan siang pilihan" style={fieldStyle} />
          </label>

          <label style={{ fontSize: 12, fontWeight: 800, color: colors.muted }}>
            Deskripsi
            <textarea name="description" maxLength={320} rows={3} placeholder="Copy singkat yang tampil di aplikasi" style={fieldStyle} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 800, color: colors.muted }}>
              Label CTA
              <input name="ctaLabel" maxLength={40} placeholder="Pesan sekarang" style={fieldStyle} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 800, color: colors.muted }}>
              Target outlet ID
              <input name="outletId" placeholder="Opsional" style={fieldStyle} />
            </label>
          </div>

          <label style={{ fontSize: 12, fontWeight: 800, color: colors.muted }}>
            URL gambar
            <input name="imageUrl" type="url" placeholder="https://... (opsional)" style={fieldStyle} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 800, color: colors.muted }}>
              Mulai tayang
              <input name="startsAt" type="datetime-local" style={fieldStyle} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 800, color: colors.muted }}>
              Berakhir
              <input name="endsAt" type="datetime-local" style={fieldStyle} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 800, color: colors.muted }}>
              Priority (-100 sampai 100)
              <input name="priority" type="number" min={-100} max={100} defaultValue={0} style={fieldStyle} />
            </label>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 800 }}>
            <input name="isActive" type="checkbox" defaultChecked />
            Aktifkan setelah dibuat
          </label>

          <button
            type="submit"
            style={{
              border: 0,
              borderRadius: 12,
              background: colors.primary,
              color: "#FFFFFF",
              padding: "12px 16px",
              fontWeight: 900,
              cursor: "pointer",
              justifySelf: "start",
            }}
          >
            Buat promo
          </button>
        </form>
      </section>

      <section style={{ marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Campaign</h2>
            <div style={{ marginTop: 5, color: colors.muted, fontSize: 13 }}>{promotions.length} promo tersimpan</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {promotions.length === 0 ? (
            <div style={{ padding: 22, borderRadius: 18, background: colors.surface, border: `1px solid ${colors.border}` }}>
              Belum ada promo. Buat campaign pertama dari form di atas.
            </div>
          ) : null}

          {promotions.map((promotion) => (
            <article
              key={promotion.id}
              style={{
                padding: 18,
                borderRadius: 18,
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 18,
              }}
            >
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 18 }}>{promotion.title}</strong>
                  <span
                    style={{
                      borderRadius: 999,
                      padding: "5px 8px",
                      fontSize: 9,
                      fontWeight: 900,
                      background: promotion.isActive ? "#E9F8EF" : colors.accent,
                      color: promotion.isActive ? colors.success : colors.muted,
                    }}
                  >
                    {promotion.isActive ? "AKTIF" : "NONAKTIF"}
                  </span>
                </div>
                {promotion.description ? (
                  <p style={{ color: colors.muted, lineHeight: 1.55, margin: "8px 0" }}>{promotion.description}</p>
                ) : null}
                <div style={{ color: colors.muted, fontSize: 11, lineHeight: 1.7 }}>
                  Mulai: {formatSchedule(promotion.startsAt)} · Berakhir: {formatSchedule(promotion.endsAt)}<br />
                  Priority: {promotion.priority}
                  {promotion.ctaLabel ? ` · CTA: ${promotion.ctaLabel}` : ""}
                  {promotion.outletId ? ` · Outlet: ${promotion.outletId}` : ""}
                  {promotion.imageUrl ? " · Gambar tersedia" : ""}
                </div>
              </div>

              <form action={togglePromotion} style={{ alignSelf: "center" }}>
                <input type="hidden" name="id" value={promotion.id} />
                <input type="hidden" name="isActive" value={String(!promotion.isActive)} />
                <button
                  type="submit"
                  style={{
                    border: `1px solid ${colors.border}`,
                    borderRadius: 999,
                    background: promotion.isActive ? "#FFFFFF" : colors.primary,
                    color: promotion.isActive ? colors.danger : "#FFFFFF",
                    padding: "9px 12px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {promotion.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
