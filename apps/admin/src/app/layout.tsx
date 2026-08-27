import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nitip Ops",
  description: "Operations dashboard for Nitip",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          background: "#F7FFF9",
          color: "#14216D",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <nav
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            padding: "12px 24px",
            borderBottom: "1px solid #A1DCD9",
            background: "#FFFFFF",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <a href="/" style={{ color: "#14216D", fontWeight: 900, textDecoration: "none" }}>
            Merchant Review
          </a>
          <a href="/drivers" style={{ color: "#08349C", fontWeight: 900, textDecoration: "none" }}>
            Driver Review
          </a>
        </nav>
        {children}
      </body>
    </html>
  );
}
