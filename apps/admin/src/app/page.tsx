import type { NitipMerchantProfile } from "@nitip/domain";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const TOKEN_COOKIE = "nitip_admin_token";

const colors = {
  background: "#F7FFF9",
  surface: "#FFFFFF",
  navy: "#14216D",
  blue: "#08349C",
  aqua: "#A1DCD9",
  mint: "#CEFCD9",
  muted: "#52607F",
  danger: "#B42318",
} as const;

const cardStyle = {
  background: colors.surface,
  border: `1px solid ${colors.aqua}`,
  borderRadius: 20,
  padding: 20,
} as const;

function apiUrl() {
  return (process.env.NITIP_API_URL ?? "http://localhost:3001").replace(/\/+$/, "");
}

async function signIn(formData: FormData) {
  "use server";

  const firebaseApiKey = process.env.FIREBASE_WEB_API_KEY?.trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!firebaseApiKey) {
    redirect("/?error=config");
  }

  if (!email || !password) {
    redirect("/?error=login");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    },
  );

  const body = (await response.json()) as {
    idToken?: string;
  };

  if (!response.ok || !body.idToken) {
    redirect("/?error=login");
  }

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

  if (!merchantId || (decision !== "approve" && decision !== "reject")) {
    redirect("/?error=review");
  }

  const response = await fetch(
    `${apiUrl()}/admin/merchants/${encodeURIComponent(merchantId)}/review`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        decision,
        ...(decision === "reject" ? { reason } : {}),
      }),
    },
  );

  if (response.status === 401) {
    cookieStore.delete(TOKEN_COOKIE);
    redirect("/?error=session");
  }

  if (response.status === 403) {
    redirect("/?error=access");
  }

  if (!response.ok) {
    redirect("/?error=review");
  }

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
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (response.status === 401) return { kind: "expired" };
    if (response.status === 403) return { kind: "forbidden" };
    if (!response.ok) return { kind: "error" };

    const body = (await response.json()) as {
      data?: NitipMerchantProfile[];
    };

    return {
      kind: "ok",
      merchants: body.data ?? [],
    };
  } catch {
    return { kind: "error" };
  }
}

function statusLabel(status: NitipMerchantProfile["status"]) {
  if (status === "pending_review") return "MENUNGGU REVIEW";
  if (status === "approved") return "APPROVED";
  if (status === "rejected") return "DITOLAK";
  return "DRAFT";
}

function errorCopy(error?: string) {
  if (error === "login") return "Email atau password Firebase tidak valid.";
  if (error === "access") return "Akun ini tidak memiliki akses Nitip Ops.";
  if (error === "session") return "Sesi admin berakhir. Silakan masuk kembali.";
  if (error === "review") return "Review tidak dapat diproses. Pastikan merchant masih menunggu review dan bukan merchant milik akun admin yang sama.";
  if (error === "config") return "FIREBASE_WEB_API_KEY belum dikonfigurasi di Admin App.";
  return null;
}

export default async function OpsHome({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  const pageError = errorCopy(params.error);

  if (!token) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: colors.background,
          padding: 24,
        }}
      >
        <section style={{ ...cardStyle, width: "100%", maxWidth: 430 }}>
          <div style={{ color: colors.navy, fontWeight: 900, fontSize: 30, letterSpacing: -1 }}>
            nitip ops.
          </div>
          <div style={{ color: colors.blue, fontWeight: 900, fontSize: 11, letterSpacing: 1.2, marginTop: 26 }}>
            OPERATIONS ACCESS
          </div>
          <h1 style={{ color: colors.navy, fontSize: 28, margin: "8px 0" }}>Masuk ke dashboard.</h1>
          <p style={{ color: colors.muted, lineHeight: 1.6, fontSize: 14 }}>
            Gunakan akun Firebase yang email-nya tercantum di ADMIN_EMAILS pada Nitip API.
          </p>

          {pageError && (
            <div style={{ background: "#FFF1F0", color: colors.danger, borderRadius: 12, padding: 12, fontSize: 13, marginTop: 16 }}>
              {pageError}
            </div>
          )}

          <form action={signIn} style={{ display: "grid", gap: 12, marginTop: 24 }}>
            <label style={{ color: colors.muted, fontSize: 12, fontWeight: 800 }}>
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  marginTop: 7,
                  border: `1px solid ${colors.aqua}`,
                  borderRadius: 12,
                  padding: "12px 13px",
                  fontSize: 14,
                }}
              />
            </label>
            <label style={{ color: colors.muted, fontSize: 12, fontWeight: 800 }}>
              Password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  marginTop: 7,
                  border: `1px solid ${colors.aqua}`,
                  borderRadius: 12,
                  padding: "12px 13px",
                  fontSize: 14,
                }}
              />
            </label>
            <button
              type="submit"
              style={{
                border: 0,
                borderRadius: 12,
                padding: "13px 16px",
                background: colors.blue,
                color: "#FFFFFF",
                fontWeight: 900,
                cursor: "pointer",
                marginTop: 6,
              }}
            >
              Masuk
            </button>
          </form>
        </section>
      </main>
    );
  }

  const result = await loadMerchants(token);

  if (result.kind !== "ok") {
    const message =
      result.kind === "forbidden"
        ? "Akun Firebase berhasil masuk, tetapi belum diberi akses Nitip Ops."
        : result.kind === "expired"
          ? "Sesi Firebase sudah kedaluwarsa. Keluar lalu masuk kembali."
          : "Nitip API tidak dapat dihubungi.";

    return (
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px", color: colors.navy }}>
        <div style={{ fontWeight: 900, fontSize: 28 }}>nitip ops.</div>
        <section style={{ ...cardStyle, marginTop: 28 }}>
          <h1 style={{ marginTop: 0 }}>Dashboard belum dapat dimuat</h1>
          <p style={{ color: colors.muted, lineHeight: 1.6 }}>{message}</p>
          {pageError && <p style={{ color: colors.danger }}>{pageError}</p>}
          <form action={signOut}>
            <button type="submit" style={{ border: 0, borderRadius: 10, background: colors.navy, color: "white", padding: "11px 14px", fontWeight: 900 }}>
              Keluar
            </button>
          </form>
        </section>
      </main>
    );
  }

  const pendingCount = result.merchants.filter(
    (merchant) => merchant.status === "pending_review",
  ).length;

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px 72px", color: colors.navy }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: -1 }}>nitip ops.</div>
          <div style={{ marginTop: 5, color: colors.muted, fontSize: 13 }}>
            Merchant review & operations
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" style={{ border: `1px solid ${colors.aqua}`, background: colors.surface, color: colors.navy, borderRadius: 999, padding: "9px 14px", fontWeight: 800, cursor: "pointer" }}>
            Keluar
          </button>
        </form>
      </header>

      {pageError && (
        <div style={{ marginTop: 20, background: "#FFF1F0", color: colors.danger, borderRadius: 14, padding: 14 }}>
          {pageError}
        </div>
      )}

      <section style={{ marginTop: 38 }}>
        <div style={{ color: colors.blue, fontWeight: 900, fontSize: 11, letterSpacing: 1.3 }}>
          MERCHANT ONBOARDING
        </div>
        <h1 style={{ margin: "6px 0 0", fontSize: 36, letterSpacing: -1.3 }}>
          Review merchant.
        </h1>
        <p style={{ color: colors.muted, lineHeight: 1.6, maxWidth: 680 }}>
          Approval membuka merchant ke public catalog. Merchant tidak bisa approve dirinya sendiri dari aplikasi Mitra.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginTop: 22 }}>
          <div style={cardStyle}>
            <div style={{ color: colors.muted, fontSize: 12 }}>Menunggu review</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginTop: 8 }}>{pendingCount}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: colors.muted, fontSize: 12 }}>Total merchant</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginTop: 8 }}>{result.merchants.length}</div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gap: 14, marginTop: 22 }}>
        {result.merchants.length === 0 && (
          <div style={cardStyle}>
            <strong>Belum ada merchant.</strong>
            <p style={{ color: colors.muted, marginBottom: 0 }}>Merchant yang mendaftar dari Nitip Mitra akan muncul di sini.</p>
          </div>
        )}

        {result.merchants.map((merchant) => (
          <article key={merchant.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 20 }}>{merchant.businessName}</div>
                <div style={{ color: colors.muted, marginTop: 5, fontSize: 13 }}>
                  {merchant.contactName} · {merchant.phoneNumber}
                </div>
              </div>
              <div style={{ background: colors.mint, color: colors.navy, borderRadius: 999, padding: "7px 10px", fontSize: 10, fontWeight: 900 }}>
                {statusLabel(merchant.status)}
              </div>
            </div>

            {merchant.description && (
              <p style={{ color: colors.muted, lineHeight: 1.6, fontSize: 13 }}>
                {merchant.description}
              </p>
            )}

            <div style={{ color: colors.muted, fontSize: 11, marginTop: 12 }}>
              Diajukan: {merchant.submittedAt ? new Date(merchant.submittedAt).toLocaleString("id-ID") : "Belum diajukan"}
              {merchant.reviewedAt ? ` · Direview: ${new Date(merchant.reviewedAt).toLocaleString("id-ID")}` : ""}
            </div>

            {merchant.rejectionReason && (
              <div style={{ marginTop: 12, background: "#FFF1F0", color: colors.danger, borderRadius: 12, padding: 12, fontSize: 12 }}>
                Alasan penolakan: {merchant.rejectionReason}
              </div>
            )}

            {merchant.status === "pending_review" && (
              <div style={{ display: "grid", gap: 10, marginTop: 18, borderTop: `1px solid ${colors.aqua}`, paddingTop: 16 }}>
                <form action={reviewMerchant}>
                  <input type="hidden" name="merchantId" value={merchant.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button type="submit" style={{ border: 0, borderRadius: 11, background: colors.blue, color: "#FFFFFF", padding: "11px 14px", fontWeight: 900, cursor: "pointer" }}>
                    Approve merchant
                  </button>
                </form>

                <form action={reviewMerchant} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input type="hidden" name="merchantId" value={merchant.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <input
                    name="reason"
                    required
                    maxLength={500}
                    placeholder="Alasan penolakan"
                    style={{
                      flex: "1 1 280px",
                      border: `1px solid ${colors.aqua}`,
                      borderRadius: 11,
                      padding: "10px 12px",
                    }}
                  />
                  <button type="submit" style={{ border: `1px solid #F4B8B2`, borderRadius: 11, background: "#FFF1F0", color: colors.danger, padding: "10px 13px", fontWeight: 900, cursor: "pointer" }}>
                    Tolak
                  </button>
                </form>
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
