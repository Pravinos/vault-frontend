import type { Metadata } from "next";
import { Inter } from "next/font/google";

import TokenRefresher from "@/components/TokenRefresher";
import AppShell from "@/components/layout/AppShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Vault",
  description: "Personal finance dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-900 text-gray-100">
        <TokenRefresher />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
