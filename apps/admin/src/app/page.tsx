import type { NitipMerchantProfile } from "@nitip/domain";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const TOKEN_COOKIE = "nitip_admin_token";

const colors = {
  background: "#F7F8FB",
  surface: "#FFFFFF",
  text: "#111318",
  primary: "#2448F5",
  muted: "#707687",
  border: "#E7E9EE",
  accent: "#EEF1FF",
  success: "#178A4A",
  successSurface: "#EAF7EF",
  warning: "#A15C00",
  warningSurface: "#FFF5DF",
  danger: "#B42318",
  dangerSurface: "#FFF1F0",
} as const;

const cardStyle = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 8px 28px rgba(17,19,24,0.05)",
} as const;

function apiUrl() {
  return (process.env.NITIP_API_URL ?? "http://localhost:3001").replace(/\/+$/, "");
}

async function signIn(formData: FormData) {
  "use server";
  const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!apiKey) redirect("/?error=config");
  if (!email || !password) redirect("/?error=login");

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = (await response.json()) as { idToken?: string };
  if (!response.ok || !body.idToken) redirect("/?error=login");

  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, body.idToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 55 * 60,
    path: "/",
  });
  redirect("/");
}

async function signOut() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
  redirect("/");
}

async function reviewMerchant(formData: FormData) {
  "use server";
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) redirect("/?error=session");

  const merchantId = String(formData.get("merchantId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!merchantId || (decision !== "approve" && decision !== "reject")) redirect("/?error=review");

  const response = await fetch(`${apiUrl()}/admin/merchants/${encodeURIComponent(merchantId)}/review`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ decision, ...(decision === "reject" ? { reason } : {}) }),
  });

  if (response.status === 401) {
    cookieStore.delete(TOKEN_COOKIE);
    redirect("/?error=session");
  }
  if (response.status === 403) redirect("/?error=access");
  if (!response.ok) redirect("/?error=review");
  revalidatePath("/");
}

type MerchantLoadResult =
  | { kind: "ok"; merchants: NitipMerchantProfile[] }
  | { kind: "forbidden" }
  | { kind: "expired" }
  | { kind: "error" };

async function loadMerchants(token: string): Promise<MerchantLoadResult> {
  try {
    const response = await fetch(`${apiUrl()}/admin/merchants`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (response.status === 401) return { kind: "expired" };
    if (response.status === 403) return { kind: "forbidden" };
    if (!response.ok) return { kind: "error" };
    const body = (await response.json()) as { data?: NitipMerchantProfile[] };
    return { kind: "ok", merchants: body.data ?? [] };
  } catch {
    return { kind: "error" };
  }
}

function statusMeta(status: NitipMerchantProfile["status"]) {
  if (status === "pending_review") return { label: "MENUNGGU", background: colors.warningSurface, color: colors.warning };
  if (status === "approved") return { label: "DISETUJUI", background: colors.successSurface, color: colors.success };
  if (status === "rejected") return { label: "DITOLAK", background: colors.dangerSurface, color: colors.danger };
  return { label: "DRAF", background: colors.accent, color: colors.muted };
}

function errorCopy(error?: string) {
  if (error === "login") return "Email atau kata sandi tidak valid.";
  if (error === "access") return "Akun ini tidak memiliki akses ke dashboard Nitip Ops.";
  if (error === "session") return "Sesi admin telah berakhir. Silakan masuk kembali.";
  if (error === "review") return "Verifikasi merchant belum dapat diproses. Periksa status merchant lalu coba lagi.";
  if (error === "config") return "Layanan autentikasi admin sementara tidak tersedia.";
  return null;
}

export default async function OpsHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  const pageError = errorCopy(params.error);

  if (!token) {
    return (
      <main style={{ minHeight: "calc(100vh - 58px)", display: "grid", placeItems: "center", background: colors.background, padding: 24 }}>
        <section style={{ ...cardStyle, width: "100%", maxWidth: 420 }}>
          <div style={{ color: colors.primary, fontWeight: 900, fontSize: 26, letterSpacing: -0.8 }}>nitip ops.</div>
          <h1 style={{ color: colors.text, fontSize: 28, margin: "28px 0 8px", letterSpacing: -0.8 }}>Masuk ke dashboard</h1>
          <p style={{ color: colors.muted, lineHeight: 1.6, fontSize: 14, marginTop: 0 }}>Gunakan akun admin Nitip untuk melanjutkan.</p>

          {pageError ? <div style={{ background: colors.dangerSurface, color: colors.danger, borderRadius: 12, padding: 12, fontSize: 13, marginTop: 16 }}>{pageError}</div> : null}

          <form action={signIn} style={{ display: "grid", gap: 14, marginTop: 24 }}>
            <label style={{ color: colors.muted, fontSize: 12, fontWeight: 800 }}>
              Email
              <input name="email" type="email" required autoComplete="email" placeholder="nama@email.com" style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 7, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "12px 13px", fontSize: 14, outlineColor: colors.primary }} />
            </label>
            <label style={{ color: colors.muted, fontSize: 12, fontWeight: 800 }}>
              Kata sandi
              <input name="password" type="password" required autoComplete="current-password" style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 7, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "12px 13px", fontSize: 14, outlineColor: colors.primary }} />
            </label>
            <button type="submit" style={{ border: 0, borderRadius: 12, padding: "13px 16px", background: colors.primary, color: "#FFFFFF", fontWeight: 900, cursor: "pointer", marginTop: 4 }}>Masuk</button>
          </form>
        </section>
      </main>
    );
  }

  const result = await loadMerchants(token);
  if (result.kind !== "ok") {
    const message = result.kind === "forbidden"
      ? "Akun ini belum memiliki akses ke dashboard Nitip Ops."
      : result.kind === "expired"
        ? "Sesi admin telah berakhir. Silakan keluar lalu masuk kembali."
        : "Dashboard belum dapat terhubung ke layanan Nitip. Coba lagi beberapa saat.";
    return (
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px", color: colors.text }}>
        <section style={cardStyle}>
          <h1 style={{ marginTop: 0 }}>Dashboard belum dapat dimuat</h1>
          <p style={{ color: colors.muted, lineHeight: 1.6 }}>{message}</p>
          {pageError ? <p style={{ color: colors.danger }}>{pageError}</p> : null}
          <form action={signOut}><button type="submit" style={{ border: 0, borderRadius: 10, background: colors.text, color: "white", padding: "11px 14px", fontWeight: 900, cursor: "pointer" }}>Keluar</button></form>
        </section>
      </main>
    );
  }

  const pendingCount = result.merchants.filter((merchant) => merchant.status === "pending_review").length;
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 24px 72px", color: colors.text }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div><h1 style={{ margin: 0, fontSize: 34, letterSpacing: -1.1 }}>Verifikasi merchant</h1><p style={{ color: colors.muted, margin: "7px 0 0" }}>Pastikan data usaha sesuai sebelum merchant ditampilkan di katalog Nitip.</p></div>
        <form action={signOut}><button type="submit" style={{ border: `1px solid ${colors.border}`, background: colors.surface, color: colors.text, borderRadius: 999, padding: "9px 14px", fontWeight: 800, cursor: "pointer" }}>Keluar</button></form>
      </header>

      {pageError ? <div style={{ marginTop: 20, background: colors.dangerSurface, color: colors.danger, borderRadius: 14, padding: 14 }}>{pageError}</div> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginTop: 28 }}>
        <div style={cardStyle}><div style={{ color: colors.muted, fontSize: 12 }}>Menunggu verifikasi</div><div style={{ fontSize: 32, fontWeight: 900, marginTop: 8 }}>{pendingCount}</div></div>
        <div style={cardStyle}><div style={{ color: colors.muted, fontSize: 12 }}>Total merchant</div><div style={{ fontSize: 32, fontWeight: 900, marginTop: 8 }}>{result.merchants.length}</div></div>
      </section>

      <section style={{ display: "grid", gap: 14, marginTop: 22 }}>
        {result.merchants.length === 0 ? <div style={cardStyle}><strong>Belum ada merchant.</strong><p style={{ color: colors.muted, marginBottom: 0 }}>Pendaftaran merchant akan muncul di sini.</p></div> : null}
        {result.merchants.map((merchant) => {
          const status = statusMeta(merchant.status);
          return (
            <article key={merchant.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div><div style={{ fontWeight: 900, fontSize: 20 }}>{merchant.businessName}</div><div style={{ color: colors.muted, marginTop: 5, fontSize: 13 }}>{merchant.contactName} · {merchant.phoneNumber}</div></div>
                <span style={{ background: status.background, color: status.color, borderRadius: 999, padding: "7px 10px", fontSize: 10, fontWeight: 900 }}>{status.label}</span>
              </div>
              {merchant.description ? <p style={{ color: colors.muted, lineHeight: 1.6, fontSize: 13 }}>{merchant.description}</p> : null}
              <div style={{ color: colors.muted, fontSize: 11, marginTop: 12 }}>Diajukan: {merchant.submittedAt ? new Date(merchant.submittedAt).toLocaleString("id-ID") : "Belum diajukan"}{merchant.reviewedAt ? ` · Ditinjau: ${new Date(merchant.reviewedAt).toLocaleString("id-ID")}` : ""}</div>
              {merchant.rejectionReason ? <div style={{ marginTop: 12, background: colors.dangerSurface, color: colors.danger, borderRadius: 12, padding: 12, fontSize: 12 }}>Alasan penolakan: {merchant.rejectionReason}</div> : null}
              {merchant.status === "pending_review" ? (
                <div style={{ display: "grid", gap: 10, marginTop: 18, borderTop: `1px solid ${colors.border}`, paddingTop: 16 }}>
                  <form action={reviewMerchant}><input type="hidden" name="merchantId" value={merchant.id} /><input type="hidden" name="decision" value="approve" /><button type="submit" style={{ border: 0, borderRadius: 11, background: colors.primary, color: "#FFFFFF", padding: "11px 14px", fontWeight: 900, cursor: "pointer" }}>Setujui merchant</button></form>
                  <form action={reviewMerchant} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input type="hidden" name="merchantId" value={merchant.id} /><input type="hidden" name="decision" value="reject" /><input name="reason" required maxLength={500} placeholder="Alasan penolakan" style={{ flex: "1 1 260px", border: `1px solid ${colors.border}`, borderRadius: 11, padding: "10px 12px" }} /><button type="submit" style={{ border: 0, borderRadius: 11, background: colors.dangerSurface, color: colors.danger, padding: "11px 14px", fontWeight: 900, cursor: "pointer" }}>Tolak</button></form>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
