"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Store,
  Truck,
  MapPin,
  Tag,
  Users,
  ChevronRight,
  Navigation,
  Compass,
  FileText,
  ShoppingBag,
  BarChart3,
  Sliders,
  X,
} from "lucide-react";

const navigationItems = [
  { name: "Executive Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Field Rep Mode (GPS)", href: "/field", icon: Navigation, highlight: true },
  { name: "Secondary Orders", href: "/orders", icon: FileText },
  { name: "Distributor Portal (DMS)", href: "/distributor-portal", icon: Truck },
  { name: "Mobile POS Terminal", href: "/pos", icon: ShoppingBag },
  { name: "Executive BI Analytics", href: "/analytics", icon: BarChart3 },
  { name: "GPS Visit Audit Log", href: "/visits", icon: Compass },
  { name: "Product Catalog Master", href: "/products", icon: Package },
  { name: "Retail Outlets Master", href: "/retailers", icon: Store },
  { name: "Distributor Network", href: "/distributors", icon: Truck },
  { name: "Beats & Route Planning", href: "/beats", icon: MapPin },
  { name: "Trade Schemes & Discounts", href: "/schemes", icon: Tag },
  { name: "Channel CRM Leads", href: "/leads", icon: Users },
  { name: "Dynamic Field Builder", href: "/admin/custom-fields", icon: Sliders },
];

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <aside className="w-64 h-full bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-md shadow-rose-500/20">
            S
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white">SAssist</span>
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-semibold uppercase">
              CRM
            </span>
          </div>
        </div>

        {isMobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Mode Sub-Badge */}
      <div className="px-4 py-2.5 bg-slate-950/30 border-b border-slate-800/60">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Neon Cloud DB Live
          </span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-300">
            SFA • DMS
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Core Masters & Admin
        </div>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-semibold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4.5 w-4.5 ${isActive ? "text-white" : item.highlight ? "text-emerald-400" : "text-slate-400"}`} />
                <span className="text-xs sm:text-sm">{item.name}</span>
              </div>
              {isActive ? (
                <ChevronRight className="h-4 w-4 text-white/80" />
              ) : item.highlight ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
                  GPS
                </span>
              ) : null}
            </Link>
          );
        })}

        <div className="pt-4 px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Next Phase
        </div>
        <div className="px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="text-slate-300 font-medium">Milestone 2 Next:</div>
          <div>• Field Rep GPS Mobile Check-in</div>
          <div>• Secondary Order Pad</div>
        </div>
      </div>

      {/* Footer Profile info */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
            RS
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">Rajesh Sharma</p>
            <p className="text-[10px] text-slate-400 font-mono">SUPER_ADMIN</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
