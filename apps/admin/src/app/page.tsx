import { calculateOrderQuote, formatRupiah } from "@nitip/domain";

const quote = calculateOrderQuote({ subtotal: 60_000, distanceKm: 3 });

const cardStyle = {
  background: "#FFFFFF",
  border: "1px solid #E3E8E2",
  borderRadius: 18,
  padding: 20,
} as const;

export default function OpsHome() {
  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 24px 72px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 24, color: "#1E5B3A" }}>nitip ops.</div>
          <div style={{ marginTop: 6, color: "#718078", fontSize: 14 }}>Control center untuk order, merchant, driver, settlement, dan support.</div>
        </div>
        <div style={{ padding: "9px 13px", borderRadius: 999, background: "#E4F1E7", color: "#227244", fontSize: 13, fontWeight: 800 }}>MVP · Development</div>
      </header>

      <section style={{ marginTop: 42 }}>
        <h1 style={{ margin: 0, fontSize: 36, letterSpacing: -1.4 }}>Operations overview</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginTop: 20 }}>
          <div style={cardStyle}><div style={{ color: "#748078", fontSize: 12 }}>Order aktif</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 10 }}>24</div></div>
          <div style={cardStyle}><div style={{ color: "#748078", fontSize: 12 }}>Merchant online</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 10 }}>18</div></div>
          <div style={cardStyle}><div style={{ color: "#748078", fontSize: 12 }}>Driver online</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 10 }}>31</div></div>
          <div style={cardStyle}><div style={{ color: "#748078", fontSize: 12 }}>GMV hari ini</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 10 }}>{formatRupiah(4_860_000)}</div></div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, marginTop: 14 }}>
        <div style={cardStyle}>
          <div style={{ color: "#748078", fontSize: 12, fontWeight: 700 }}>UNIT ECONOMICS SAMPLE</div>
          <h2 style={{ marginBottom: 18 }}>Order Rp60.000 · 3 km</h2>
          {[
            ["Customer total", quote.customerTotal],
            ["Merchant net", quote.merchantNet],
            ["Driver earning", quote.driverEarning],
            ["Platform gross", quote.platformGross],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #EEF0ED" }}>
              <span style={{ color: "#66736B" }}>{label}</span>
              <strong>{formatRupiah(Number(value))}</strong>
            </div>
          ))}
          <p style={{ color: "#78847C", fontSize: 12, lineHeight: 1.6, marginBottom: 0 }}>Payment gateway fee belum dikurangi pada simulasi ini. Settlement/payment akan menjadi modul terpisah.</p>
        </div>

        <div style={{ ...cardStyle, background: "#1E5B3A", color: "white", borderColor: "#1E5B3A" }}>
          <div style={{ color: "#BFD6C6", fontSize: 12, fontWeight: 700 }}>NEXT FOUNDATION</div>
          <h2>Order lifecycle</h2>
          <p style={{ color: "#DCE8DF", lineHeight: 1.7 }}>Tahap berikutnya menghubungkan customer checkout → merchant acceptance → driver dispatch → delivery → settlement dalam satu state machine yang konsisten.</p>
        </div>
      </section>
    </main>
  );
}
