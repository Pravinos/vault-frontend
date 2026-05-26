"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  Target,
  Settings,
  TrendingUp,
  FileText,
  X,
} from "lucide-react";

import { logout } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { fetchDashboard, getExpenseSummary, getIncomeSummary } from "@/lib/api";
import { getLastNMonths } from "@/lib/hooks/useDashboard";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/income", label: "Income", icon: TrendingUp },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/ai/summaries", label: "Summaries", icon: FileText },
];

const settingsItems = [
  { href: "/settings/ai", label: "AI Settings", icon: Settings },
];

export function SidebarMenuButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-1 text-gray-400 transition-colors hover:text-white"
      aria-label="Open navigation"
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}

export default function Sidebar({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const prefetchDashboard = useCallback(() => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard,
      queryFn: async () => {
        const monthRange = getLastNMonths(6);
        const [dashboard, expenseSummaries, incomeSummaries] = await Promise.all([
          fetchDashboard(),
          Promise.all(monthRange.map((month) => getExpenseSummary(month))),
          Promise.all(monthRange.map((month) => getIncomeSummary(month))),
        ]);
        return { dashboard, expenseSummaries, incomeSummaries, monthRange };
      },
      staleTime: 2 * 60 * 1000,
    });
  }, []);

  const sidebarContent = (
    <div className="flex h-full w-[220px] flex-col bg-[#0f1923]">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-5">
        <Link
          href="/dashboard"
          onMouseEnter={prefetchDashboard}
          aria-label="Go to dashboard"
          className="inline-flex items-center gap-2"
        >
          <img
            src="/vault-logo.svg"
            alt="Vault"
            className="h-6 w-auto transform transition-transform hover:scale-105 hover:-rotate-2 cursor-pointer"
          />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="p-1 text-gray-400 transition-colors hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onMouseEnter={href === "/dashboard" ? prefetchDashboard : undefined}
              className={`flex items-center w-full transition-colors border-l-[3px] ${
                active ? 'border-l-[#1D9E75]' : 'border-l-transparent'
              }`}
            >
              <div
                className={`inline-flex items-center gap-3 px-3 py-2 rounded-md ml-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[rgba(29,158,117,0.15)] text-[#1D9E75]'
                    : 'text-gray-400 hover:bg-white/4 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </div>
            </Link>
          );
        })}

        <div className="pb-1 pt-4">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Settings
          </p>
        </div>

        {settingsItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center w-full transition-colors border-l-[3px] ${
                active ? 'border-l-[#1D9E75]' : 'border-l-transparent'
              }`}
            >
              <div
                className={`inline-flex items-center gap-3 px-3 py-2 rounded-md ml-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[rgba(29,158,117,0.15)] text-[#1D9E75]'
                    : 'text-gray-400 hover:bg-white/4 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 px-3 py-4">
        <div className="flex w-full">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-3 px-3 py-2 rounded-md ml-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed left-0 top-0 z-30 hidden h-full w-[220px] border-r border-white/5 lg:block">
        {sidebarContent}
      </div>

      <div
        className={`fixed inset-0 z-40 flex transition-opacity duration-200 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div
          className={`relative z-50 h-full shadow-2xl transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
