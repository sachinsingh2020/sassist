"use client";

import { useState } from "react";
import { exportReportData } from "@/actions/analytics";
import {
  BarChart3,
  TrendingUp,
  Download,
  Users,
  Package,
  Store,
  Truck,
  Compass,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Target,
} from "lucide-react";

interface AnalyticsClientProps {
  initialData: {
    metrics: {
      secondarySalesTotal: number;
      posSalesTotal: number;
      combinedGrossSales: number;
      totalOrders: number;
      totalVisits: number;
      strikeRate: number;
      monthlyTarget: number;
      targetAchievementPercent: number;
      activeRetailers: number;
      activeDistributors: number;
    };
    repLeaderboard: Array<{
      name: string;
      email: string;
      visitsCount: number;
      ordersCount: number;
      orderValue: number;
    }>;
    topSkus: Array<{
      name: string;
      sku: string;
      unitsSold: number;
      totalValue: number;
      uom: string;
    }>;
    recentOrders: any[];
  };
}

export default function AnalyticsClient({ initialData }: AnalyticsClientProps) {
  const [data, setData] = useState(initialData);
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  const m = data.metrics;

  async function handleDownload(reportType: "orders" | "visits" | "inventory" | "retailers") {
    setDownloadingReport(reportType);
    try {
      const csv = await exportReportData(reportType);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sassist_${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert("Failed to export report: " + e.message);
    } finally {
      setDownloadingReport(null);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Executive BI Analytics & Visual Reporting
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time business intelligence: Secondary sales velocity, rep call strike rates, SKU penetration, and data exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Live BI Engine
          </span>
        </div>
      </div>

      {/* Target Achievement & Gross Turnover Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Target vs Achievement */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-5 text-white shadow-xl border border-indigo-900/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-indigo-200 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Target className="h-4 w-4 text-emerald-400" /> Monthly Secondary Target
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {m.targetAchievementPercent}% Achieved
              </span>
            </div>
            <div className="text-3xl font-black text-white mt-2">
              ₹{m.secondarySalesTotal.toLocaleString()}{" "}
              <span className="text-xs font-normal text-slate-400">
                / ₹{m.monthlyTarget.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-teal-400 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(m.targetAchievementPercent, 8)}%` }}
              ></div>
            </div>
            <p className="text-[11px] text-indigo-200 mt-1.5">
              Based on secondary orders captured at retailer counters.
            </p>
          </div>
        </div>

        {/* Strike Rate */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
              Field Strike Rate (Productive Calls)
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900">{m.strikeRate}%</span>
              <span className="text-xs text-slate-500">Order Conversion</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Total Counter Visits: <strong>{m.totalVisits}</strong></span>
            <span>Orders Booked: <strong>{m.totalOrders}</strong></span>
          </div>
        </div>

        {/* Combined Turnover */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
              Omnichannel Sales Turnover
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-emerald-600">
                ₹{m.combinedGrossSales.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Field Secondary: ₹{m.secondarySalesTotal.toLocaleString()}</span>
            <span>m-POS Counter: ₹{m.posSalesTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Two Column: Rep Leaderboard & Top SKUs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rep Productivity Leaderboard */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              Field Sales Officers (FSO) Leaderboard
            </h3>
            <span className="text-xs text-slate-400">Ranked by Sales Value</span>
          </div>

          <div className="space-y-3">
            {data.repLeaderboard.map((rep, idx) => (
              <div
                key={rep.email}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{rep.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">{rep.email}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-sm text-slate-900 block">
                    ₹{rep.orderValue.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {rep.visitsCount} Visits • {rep.ordersCount} Orders
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Selling SKUs */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-600" />
              Top Penetrating FMCG SKUs
            </h3>
            <span className="text-xs text-slate-400">By Secondary Revenue</span>
          </div>

          <div className="space-y-3">
            {data.topSkus.map((sku) => (
              <div
                key={sku.sku}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {sku.sku}
                  </span>
                  <h4 className="font-bold text-slate-900 mt-1">{sku.name}</h4>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {sku.unitsSold} {sku.uom} dispatched
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-black text-sm text-emerald-600 block">
                    ₹{sku.totalValue.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}

            {data.topSkus.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No SKU sales recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSV Export Engine Section */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-slate-800 space-y-4">
        <div>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
            Data Export Engine
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
            Download Enterprise Excel / CSV Reports
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Export raw operational logs, secondary sales registers, distributor balances, and field GPS audit logs for offline accounting and BI tools.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <button
            onClick={() => handleDownload("orders")}
            disabled={downloadingReport !== null}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition flex items-center justify-between text-left group"
          >
            <div>
              <span className="text-xs font-bold text-white block">Secondary Orders</span>
              <span className="text-[10px] text-slate-400">All bookings with GST & discounts</span>
            </div>
            <Download className="h-4 w-4 text-emerald-400 group-hover:translate-y-0.5 transition" />
          </button>

          <button
            onClick={() => handleDownload("visits")}
            disabled={downloadingReport !== null}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition flex items-center justify-between text-left group"
          >
            <div>
              <span className="text-xs font-bold text-white block">GPS Visits Audit</span>
              <span className="text-[10px] text-slate-400">Timestamps, geo-tags & outcomes</span>
            </div>
            <Download className="h-4 w-4 text-emerald-400 group-hover:translate-y-0.5 transition" />
          </button>

          <button
            onClick={() => handleDownload("inventory")}
            disabled={downloadingReport !== null}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition flex items-center justify-between text-left group"
          >
            <div>
              <span className="text-xs font-bold text-white block">Stock & Inventory</span>
              <span className="text-[10px] text-slate-400">Warehouse balances & landing costs</span>
            </div>
            <Download className="h-4 w-4 text-emerald-400 group-hover:translate-y-0.5 transition" />
          </button>

          <button
            onClick={() => handleDownload("retailers")}
            disabled={downloadingReport !== null}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 transition flex items-center justify-between text-left group"
          >
            <div>
              <span className="text-xs font-bold text-white block">Retail Outlets Master</span>
              <span className="text-[10px] text-slate-400">Store database with beat mappings</span>
            </div>
            <Download className="h-4 w-4 text-emerald-400 group-hover:translate-y-0.5 transition" />
          </button>
        </div>
      </div>
    </div>
  );
}
