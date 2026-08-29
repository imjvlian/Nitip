import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nitip Ops",
  description: "Dashboard operasional Nitip",
};

const linkStyle = {
  color: "#52607F",
  fontSize: 13,
  fontWeight: 800,
  textDecoration: "none",
  padding: "8px 10px",
  borderRadius: 10,
} as const;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          background: "#F7F8FB",
          color: "#111318",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <nav
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "12px 24px",
            borderBottom: "1px solid #E7E9EE",
            background: "rgba(255,255,255,0.96)",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <a href="/" style={{ color: "#2448F5", fontSize: 17, fontWeight: 900, marginRight: 8, textDecoration: "none" }}>
            nitip ops.
          </a>
          <a href="/" style={linkStyle}>Merchant</a>
          <a href="/drivers" style={linkStyle}>Driver</a>
          <a href="/promos" style={linkStyle}>Promo</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
