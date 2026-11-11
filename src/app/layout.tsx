import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Plex was drawn for dense technical UI: tabular figures, distinct 0/O and 1/l/I.
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Observability — Unified Dashboard",
  description:
    "Unified Observability Dashboard combining Grafana (Elasticsearch Metricbeat & VictoriaMetrics), Kibana (Elasticsearch Data TRX), and Datadog APM panels in one synchronized workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-canvas text-ink font-sans text-[13px] antialiased">
        {children}
      </body>
    </html>
  );
}
