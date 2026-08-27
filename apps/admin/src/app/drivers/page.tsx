import type { NitipDriverProfile } from "@nitip/domain/driver";
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

  if (!driverId || (decision !== "approve" && decision !== "reject")) {
    redirect("/drivers?error=review");
  }

  const response = await fetch(
    `${apiUrl()}/admin/drivers/${encodeURIComponent(driverId)}/review`,
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

  if (response.status === 401 || response.status === 403) redirect("/");
  if (!response.ok) redirect("/drivers?error=review");

  revalidatePath("/drivers");
}

async function loadDrivers(token: string) {
  try {
    const response = await fetch(`${apiUrl()}/admin/drivers`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
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

function statusLabel(status: NitipDriverProfile["status"]) {
  switch (status) {
    case "draft": return "DRAFT";
    case "pending_review": return "MENUNGGU REVIEW";
    case "approved": return "APPROVED";
    case "rejected": return "DITOLAK";
  }
}

export default async function DriverOpsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) redirect("/");

  const drivers = await loadDrivers(token);
  if (!drivers) redirect("/");

  const pending = drivers.filter((driver) => driver.status === "pending_review").length;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 24px 72px" }}>
      <div style={{ color: colors.blue, fontWeight: 900, fontSize: 11, letterSpacing: 1.3 }}>
        DRIVER OPERATIONS
      </div>
      <h1 style={{ color: colors.navy, fontSize: 36, margin: "7px 0 0", letterSpacing: -1.3 }}>
        Review driver.
      </h1>
      <p style={{ color: colors.muted, lineHeight: 1.6, maxWidth: 680 }}>
        Driver hanya dapat online setelah approval Ops. Approval tetap dilakukan server-side dan driver tidak dapat mereview akunnya sendiri.
      </p>

      {params.error ? (
        <div style={{ marginTop: 18, background: "#FFF1F0", color: colors.danger, padding: 13, borderRadius: 13 }}>
          Review driver gagal diproses. Pastikan alasan penolakan diisi dan status masih menunggu review.
        </div>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginTop: 24 }}>
        <div style={{ background: colors.surface, border: `1px solid ${colors.aqua}`, borderRadius: 18, padding: 18 }}>
          <div style={{ color: colors.muted, fontSize: 12 }}>Menunggu review</div>
          <div style={{ color: colors.navy, fontSize: 32, fontWeight: 900, marginTop: 7 }}>{pending}</div>
        </div>
        <div style={{ background: colors.surface, border: `1px solid ${colors.aqua}`, borderRadius: 18, padding: 18 }}>
          <div style={{ color: colors.muted, fontSize: 12 }}>Total driver</div>
          <div style={{ color: colors.navy, fontSize: 32, fontWeight: 900, marginTop: 7 }}>{drivers.length}</div>
        </div>
      </section>

      <section style={{ display: "grid", gap: 14, marginTop: 22 }}>
        {drivers.length === 0 ? (
          <div style={{ background: colors.surface, border: `1px solid ${colors.aqua}`, borderRadius: 18, padding: 18, color: colors.navy }}>
            <strong>Belum ada driver.</strong>
            <p style={{ color: colors.muted, marginBottom: 0 }}>Pendaftaran dari Nitip Driver akan muncul di sini.</p>
          </div>
        ) : null}

        {drivers.map((driver) => (
          <article key={driver.id} style={{ background: colors.surface, border: `1px solid ${colors.aqua}`, borderRadius: 20, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: colors.navy, fontWeight: 900, fontSize: 20 }}>{driver.fullName}</div>
                <div style={{ color: colors.muted, fontSize: 13, marginTop: 5 }}>{driver.phoneNumber}</div>
              </div>
              <div style={{ background: colors.mint, color: colors.navy, borderRadius: 999, padding: "7px 10px", fontSize: 10, fontWeight: 900 }}>
                {statusLabel(driver.status)}
              </div>
            </div>

            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div style={{ background: colors.background, borderRadius: 13, padding: 12 }}>
                <div style={{ color: colors.muted, fontSize: 10 }}>KENDARAAN</div>
                <div style={{ color: colors.navy, fontWeight: 800, marginTop: 4 }}>{driver.vehicleBrandModel}</div>
              </div>
              <div style={{ background: colors.background, borderRadius: 13, padding: 12 }}>
                <div style={{ color: colors.muted, fontSize: 10 }}>JENIS</div>
                <div style={{ color: colors.navy, fontWeight: 800, marginTop: 4 }}>{driver.vehicleType === "motorcycle" ? "Motor" : "Mobil"}</div>
              </div>
              <div style={{ background: colors.background, borderRadius: 13, padding: 12 }}>
                <div style={{ color: colors.muted, fontSize: 10 }}>PLAT</div>
                <div style={{ color: colors.navy, fontWeight: 800, marginTop: 4 }}>{driver.vehiclePlate}</div>
              </div>
            </div>

            <div style={{ color: colors.muted, fontSize: 11, marginTop: 13 }}>
              Diajukan: {driver.submittedAt ? new Date(driver.submittedAt).toLocaleString("id-ID") : "Belum diajukan"}
              {driver.reviewedAt ? ` · Direview: ${new Date(driver.reviewedAt).toLocaleString("id-ID")}` : ""}
            </div>

            {driver.rejectionReason ? (
              <div style={{ marginTop: 12, background: "#FFF1F0", color: colors.danger, borderRadius: 12, padding: 12, fontSize: 12 }}>
                Alasan penolakan: {driver.rejectionReason}
              </div>
            ) : null}

            {driver.status === "pending_review" ? (
              <div style={{ display: "grid", gap: 10, borderTop: `1px solid ${colors.aqua}`, paddingTop: 16, marginTop: 18 }}>
                <form action={reviewDriver}>
                  <input type="hidden" name="driverId" value={driver.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button type="submit" style={{ border: 0, borderRadius: 11, background: colors.blue, color: "white", padding: "11px 14px", fontWeight: 900, cursor: "pointer" }}>
                    Approve driver
                  </button>
                </form>

                <form action={reviewDriver} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input type="hidden" name="driverId" value={driver.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <input name="reason" required placeholder="Alasan penolakan..." style={{ flex: "1 1 260px", border: `1px solid ${colors.aqua}`, borderRadius: 11, padding: "10px 12px" }} />
                  <button type="submit" style={{ border: 0, borderRadius: 11, background: "#FFF1F0", color: colors.danger, padding: "11px 14px", fontWeight: 900, cursor: "pointer" }}>
                    Tolak
                  </button>
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
