"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Target, Wallet } from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: Receipt,
  },
  {
    href: "/goals",
    label: "Goals",
    icon: Target,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col bg-gray-950 px-4 py-6">
      <div className="flex items-center gap-2 px-2 text-white">
        <Wallet className="h-6 w-6" />
        <span className="text-lg font-semibold">Vault</span>
      </div>
      <nav className="mt-8 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const itemClasses = isActive
            ? "flex items-center gap-3 rounded-md bg-gray-800 px-3 py-2 text-white"
            : "flex items-center gap-3 rounded-md px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white";

          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className={itemClasses}>
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
