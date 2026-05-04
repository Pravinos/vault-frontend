"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import PageTransition from "@/components/layout/PageTransition";
import Sidebar, { SidebarMenuButton } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isAuthRoute =
    pathname === "/login" || pathname === "/setup" || pathname === "/register";

  if (isAuthRoute) {
    return <PageTransition>{children}</PageTransition>;
  }

  return (
    <div className="min-h-screen bg-[#0d1520] text-white">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="min-h-screen lg:ml-[220px]">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-white/5 bg-[#0f1923] px-4 py-4 lg:hidden">
          <SidebarMenuButton onClick={() => setSidebarOpen(true)} />
          <span className="text-base font-semibold text-white">Vault</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
