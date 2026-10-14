import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";

// Font sesuai Design System RuteKu
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RuteKu - Pesan Tiket Bus Antarkota",
  description: "Pesan kursi bus antarkota tanpa rebutan. Pemilihan kursi interaktif, pembayaran mudah, dan e-tiket instan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${jakarta.variable} ${mono.variable}`}>
      <body className="font-sans bg-surface text-ink antialiased min-h-screen flex flex-col">
        <Suspense fallback={<div className="h-16 bg-white border-b border-borderCol" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1">
          <Suspense fallback={<div className="p-8 text-center text-muted">Memuat halaman...</div>}>
            {children}
          </Suspense>
        </main>
      </body>
    </html>
  );
}
