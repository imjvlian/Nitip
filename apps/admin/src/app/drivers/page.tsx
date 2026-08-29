import type { NitipDriverProfile } from "@nitip/domain/driver";
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

async function reviewDriver(formData: FormData) {
  "use server";
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) redirect("/");

  const driverId = String(formData.get("driverId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!driverId || (decision !== "approve" && decision !== "reject")) redirect("/drivers?error=review");

  const response = await fetch(`${apiUrl()}/admin/drivers/${encodeURIComponent(driverId)}/review`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ decision, ...(decision === "reject" ? { reason } : {}) }),
  });
  if (response.status === 401 || response.status === 403) redirect("/");
  if (!response.ok) redirect("/drivers?error=review");
  revalidatePath("/drivers");
}

async function loadDrivers(token: string) {
  try {
    const response = await fetch(`${apiUrl()}/admin/drivers`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) return [] as NitipDriverProfile[];
    const body = (await response.json()) as { data?: NitipDriverProfile[] };
    return body.data ?? [];
  } catch {
    return [] as NitipDriverProfile[];
  }
}

function statusMeta(status: NitipDriverProfile["status"]) {
  if (status === "pending_review") return { label: "MENUNGGU", background: colors.warningSurface, color: colors.warning };
  if (status === "approved") return { label: "DISETUJUI", background: colors.successSurface, color: colors.success };
  if (status === "rejected") return { label: "DITOLAK", background: colors.dangerSurface, color: colors.danger };
  return { label: "DRAF", background: colors.accent, color: colors.muted };
}

export default async function DriverOpsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) redirect("/");

  const drivers = await loadDrivers(token);
  if (!drivers) redirect("/");
  const pending = drivers.filter((driver) => driver.status === "pending_review").length;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 72px", color: colors.text }}>
      <header>
        <h1 style={{ fontSize: 34, margin: 0, letterSpacing: -1.1 }}>Verifikasi driver</h1>
        <p style={{ color: colors.muted, lineHeight: 1.6, maxWidth: 680, margin: "7px 0 0" }}>
          Pastikan data driver dan kendaraan sesuai sebelum akun dapat menerima pengantaran.
        </p>
      </header>

      {params.error ? <div style={{ marginTop: 18, background: colors.dangerSurface, color: colors.danger, padding: 13, borderRadius: 13 }}>Verifikasi driver belum dapat diproses. Periksa data lalu coba lagi.</div> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginTop: 28 }}>
        <div style={cardStyle}><div style={{ color: colors.muted, fontSize: 12 }}>Menunggu verifikasi</div><div style={{ color: colors.text, fontSize: 32, fontWeight: 900, marginTop: 7 }}>{pending}</div></div>
        <div style={cardStyle}><div style={{ color: colors.muted, fontSize: 12 }}>Total driver</div><div style={{ color: colors.text, fontSize: 32, fontWeight: 900, marginTop: 7 }}>{drivers.length}</div></div>
      </section>

      <section style={{ display: "grid", gap: 14, marginTop: 22 }}>
        {drivers.length === 0 ? <div style={cardStyle}><strong>Belum ada driver.</strong><p style={{ color: colors.muted, marginBottom: 0 }}>Pendaftaran driver akan muncul di sini.</p></div> : null}

        {drivers.map((driver) => {
          const status = statusMeta(driver.status);
          return (
            <article key={driver.id} style={cardStyle}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div><div style={{ color: colors.text, fontWeight: 900, fontSize: 20 }}>{driver.fullName}</div><div style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>{driver.phoneNumber}</div></div>
                <span style={{ background: status.background, color: status.color, borderRadius: 999, padding: "7px 10px", fontSize: 10, fontWeight: 900 }}>{status.label}</span>
              </div>

              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div style={{ background: colors.background, borderRadius: 13, padding: 12 }}><div style={{ color: colors.muted, fontSize: 10 }}>KENDARAAN</div><div style={{ color: colors.text, fontWeight: 800, marginTop: 4 }}>{driver.vehicleBrandModel}</div></div>
                <div style={{ background: colors.background, borderRadius: 13, padding: 12 }}><div style={{ color: colors.muted, fontSize: 10 }}>JENIS</div><div style={{ color: colors.text, fontWeight: 800, marginTop: 4 }}>{driver.vehicleType === "motorcycle" ? "Motor" : "Mobil"}</div></div>
                <div style={{ background: colors.background, borderRadius: 13, padding: 12 }}><div style={{ color: colors.muted, fontSize: 10 }}>PLAT</div><div style={{ color: colors.text, fontWeight: 800, marginTop: 4 }}>{driver.vehiclePlate}</div></div>
              </div>

              <div style={{ color: colors.muted, fontSize: 11, marginTop: 13 }}>Diajukan: {driver.submittedAt ? new Date(driver.submittedAt).toLocaleString("id-ID") : "Belum diajukan"}{driver.reviewedAt ? ` · Ditinjau: ${new Date(driver.reviewedAt).toLocaleString("id-ID")}` : ""}</div>
              {driver.rejectionReason ? <div style={{ marginTop: 12, background: colors.dangerSurface, color: colors.danger, borderRadius: 12, padding: 12, fontSize: 12 }}>Alasan penolakan: {driver.rejectionReason}</div> : null}

              {driver.status === "pending_review" ? (
                <div style={{ display: "grid", gap: 10, borderTop: `1px solid ${colors.border}`, paddingTop: 16, marginTop: 18 }}>
                  <form action={reviewDriver}><input type="hidden" name="driverId" value={driver.id} /><input type="hidden" name="decision" value="approve" /><button type="submit" style={{ border: 0, borderRadius: 11, background: colors.primary, color: "white", padding: "11px 14px", fontWeight: 900, cursor: "pointer" }}>Setujui driver</button></form>
                  <form action={reviewDriver} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input type="hidden" name="driverId" value={driver.id} /><input type="hidden" name="decision" value="reject" /><input name="reason" required placeholder="Alasan penolakan" style={{ flex: "1 1 260px", border: `1px solid ${colors.border}`, borderRadius: 11, padding: "10px 12px" }} /><button type="submit" style={{ border: 0, borderRadius: 11, background: colors.dangerSurface, color: colors.danger, padding: "11px 14px", fontWeight: 900, cursor: "pointer" }}>Tolak</button></form>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
