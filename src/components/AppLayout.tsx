"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import PageTransition from "@/components/layout/PageTransition";
import Sidebar, { SidebarMenuButton } from "@/components/Sidebar";
import TokenRefresher from "@/components/TokenRefresher";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/setup" ||
    pathname === "/register" ||
    pathname === "/reset-password" ||
    pathname === "/starting";

  if (isAuthRoute) {
    return <PageTransition>{children}</PageTransition>;
  }

  return (
    <div className="min-h-screen bg-app-bg text-white">
      <TokenRefresher />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="min-h-screen overflow-x-hidden lg:ml-[220px]">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-sidebar px-4 py-4 lg:hidden">
          <SidebarMenuButton onClick={() => setSidebarOpen(true)} />
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            className="inline-flex items-center"
          >
            <img
              src="/vault-logo.svg"
              alt="Vault"
              className="h-5 w-auto transform transition-transform hover:scale-105 hover:-rotate-2 cursor-pointer"
            />
          </Link>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
