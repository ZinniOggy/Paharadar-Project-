import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { Shell } from "@/components/Shell";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: {
    default: "Paharadar // Passive Web Security Audit & Telemetry Suite",
    template: "%s · Paharadar",
  },
  description:
    "Passive website security audit, SSL/TLS reconnaissance, and remediation platform built for Bangladesh digital assets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable}`}>
      <body className="antialiased bg-[#040707] text-[#f1f8f5] selection:bg-[#00ff88] selection:text-[#021a11]">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
