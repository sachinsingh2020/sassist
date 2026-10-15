"use client";

import { Menu, Bell, ShieldCheck } from "lucide-react";

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export default function Header({ onOpenMobileMenu }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
          <span className="font-semibold text-slate-900 truncate max-w-[120px] sm:max-w-none">
            SAssist
          </span>
          <span className="hidden sm:inline">/</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 truncate">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            Enterprise CRM
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        <div className="hidden lg:flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-medium text-slate-600">Region: Delhi-NCR & Mumbai</span>
        </div>

        <button className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition relative">
          <Bell className="h-4 w-4" />
          <span className="h-2 w-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-white"></span>
        </button>

        <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>

        <div className="flex items-center gap-2 pl-1">
          <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
            RS
          </div>
          <span className="hidden sm:block text-xs font-medium text-slate-700">Admin</span>
        </div>
      </div>
    </header>
  );
}
