"use client";

import { useEffect, useCallback, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  PieChart,
  Target,
  Settings,
  TrendingUp,
  FileText,
  X,
} from "lucide-react";

import { logout } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { dashboardQueryOptions } from "@/lib/hooks/useDashboard";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const navRowWrapper = "flex w-full";
const navRowPill =
  "inline-flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium transition-colors";

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/income", label: "Income", icon: TrendingUp },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/ai/summaries", label: "Summaries", icon: FileText },
];

const settingsItems: NavItem[] = [
  { href: "/settings/ai", label: "AI Settings", icon: Settings },
];

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavLink({
  href,
  label,
  icon: Icon,
  pathname,
  onMouseEnter,
}: NavItem & {
  pathname: string;
  onMouseEnter?: () => void;
}) {
  const active = isActiveRoute(pathname, href);

  return (
    <Link
      href={href}
      onMouseEnter={onMouseEnter}
      aria-current={active ? "page" : undefined}
      className={navRowWrapper}
    >
      <span
        className={
          active
            ? `${navRowPill} bg-vault-green-muted text-vault-green`
            : `${navRowPill} text-gray-400 hover:bg-white/4 hover:text-white`
        }
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span>{label}</span>
      </span>
    </Link>
  );
}

function SidebarNavButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={navRowWrapper}
    >
      <span className={`${navRowPill} text-gray-400 hover:bg-white/4 hover:text-white`}>
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span>{label}</span>
      </span>
    </button>
  );
}

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
    window.location.href = "/login";
  };

  const prefetchDashboard = useCallback(() => {
    void queryClient.prefetchQuery(dashboardQueryOptions);
  }, []);

  const sidebarContent = (
    <div className="flex h-full w-[220px] flex-col bg-vault-surface">
      <div className="relative flex items-center justify-center border-b border-white/5 px-5 py-5">
        <Link
          href="/dashboard"
          onMouseEnter={prefetchDashboard}
          aria-label="Go to dashboard"
          className="inline-flex items-center gap-2"
        >
          <img
            src="/vault-logo.svg"
            alt="Vault"
            className="h-6 w-auto cursor-pointer transform transition-transform hover:scale-105 hover:-rotate-2"
          />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-5 p-1 text-gray-400 transition-colors hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <SidebarNavLink
            key={item.href}
            {...item}
            pathname={pathname}
            onMouseEnter={item.href === "/dashboard" ? prefetchDashboard : undefined}
          />
        ))}

        <div className="pb-1 pt-4">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Settings
          </p>
        </div>

        {settingsItems.map((item) => (
          <SidebarNavLink key={item.href} {...item} pathname={pathname} />
        ))}
      </nav>

      <div className="border-t border-white/5 px-3 py-4">
        <SidebarNavButton label="Logout" icon={LogOut} onClick={handleLogout} />
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <aside
        aria-label="Navigation"
        className={`fixed left-0 top-0 z-50 h-full w-[220px] border-r border-white/5 bg-vault-surface shadow-2xl transition-transform duration-300 ease-out lg:z-30 lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
