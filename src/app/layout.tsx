import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import AppLayout from "@/components/AppLayout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Vault",
  description: "Personal finance dashboard",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#0d1520] text-gray-100">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
