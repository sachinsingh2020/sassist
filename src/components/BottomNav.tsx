"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Navigation, FileText, Store, Package } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Field Rep", href: "/field", icon: Navigation, isField: true },
    { name: "Orders", href: "/orders", icon: FileText },
    { name: "Outlets", href: "/retailers", icon: Store },
    { name: "SKUs", href: "/products", icon: Package },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
              isActive
                ? "text-indigo-600 font-bold scale-105"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className={`h-5 w-5 mb-0.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
