"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BotMessageSquare,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  Landmark,
  LayoutDashboard,
  LogOut,
  Receipt,
  ScrollText,
  Settings2,
  Target,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { logout } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/income", label: "Income", icon: HandCoins },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/chat", label: "Chat", icon: BotMessageSquare },
  { href: "/ai/summaries", label: "Summaries", icon: ScrollText },
];

const secondaryNavItems = [
  { href: "/settings/ai", label: "AI Settings", icon: Settings2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem("vault_sidebar_collapsed") === "true";
  });

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("vault_sidebar_collapsed", String(next));
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside
      className={`hidden md:flex h-screen sticky top-0 flex-col bg-gray-950 transition-all duration-200 flex-shrink-0 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div
        className={`flex items-center gap-2 px-4 py-6 text-white ${
          collapsed ? "justify-center px-0" : ""
        }`}
      >
        <Wallet className="h-6 w-6 flex-shrink-0" />
        {!collapsed && <span className="text-lg font-semibold">Vault</span>}
      </div>

      <div className="mx-3 border-t border-gray-800" />

      <nav className="mt-4 flex flex-col gap-1 px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center px-2" : "px-3"
              } ${
                isActive
                  ? "border-l-[3px] border-emerald-500 bg-gray-800 text-white" +
                    (collapsed ? "" : " pl-[9px]")
                  : "text-gray-400 hover:bg-gray-800/70 hover:text-white hover:border-l-[3px] hover:border-emerald-500/40" +
                    (collapsed ? "" : " hover:pl-[9px]")
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mt-4 border-t border-gray-800" />

      <nav className="mt-2 flex flex-col gap-1 px-2">
        {!collapsed && (
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            Settings
          </p>
        )}
        {secondaryNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center px-2" : "px-3"
              } ${
                isActive
                  ? "border-l-[3px] border-emerald-500 bg-gray-800 text-white" +
                    (collapsed ? "" : " pl-[9px]")
                  : "text-gray-400 hover:bg-gray-800/70 hover:text-white hover:border-l-[3px] hover:border-emerald-500/40" +
                    (collapsed ? "" : " hover:pl-[9px]")
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 px-2 pb-4">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          className={`flex w-full items-center rounded-md p-2 text-gray-400 transition-colors duration-150 hover:bg-gray-800 hover:text-white ${
            collapsed ? "justify-center" : "gap-3 px-3"
          }`}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>

        <button
          type="button"
          onClick={toggleCollapse}
          className="flex w-full items-center justify-center rounded-md p-2 text-gray-400 transition-colors duration-150 hover:bg-gray-800 hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
