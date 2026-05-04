"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

import BottomNav from "@/components/layout/BottomNav";
import PageTransition from "@/components/layout/PageTransition";
import Sidebar from "@/components/layout/Sidebar";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login" || pathname === "/setup";

  if (isAuthRoute) {
    return <PageTransition>{children}</PageTransition>;
  }

  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 bg-gray-900 pb-20 md:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <BottomNav />
    </>
  );
}