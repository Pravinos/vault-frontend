import type { Metadata } from "next";
import { Inter } from "next/font/google";

import BottomNav from "@/components/layout/BottomNav";
import PageTransition from "@/components/layout/PageTransition";
import Sidebar from "@/components/layout/Sidebar";
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
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 bg-gray-900 pb-20 md:pb-0">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
