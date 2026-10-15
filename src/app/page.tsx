import { getDashboardOverview } from "@/actions/masters";
import Link from "next/link";
import {
  Package,
  Store,
  Truck,
  MapPin,
  Tag,
  Users,
  ArrowUpRight,
  PlusCircle,
  CheckCircle2,
  FileText,
  ShoppingCart,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { metrics, recentProducts, recentRetailers, recentOrders } = await getDashboardOverview();

  const statCards = [
    {
      title: "Secondary Orders",
      value: metrics.totalOrders,
      subtitle: "Field orders captured",
      icon: FileText,
      color: "from-blue-600 to-indigo-600",
      href: "/orders",
    },
    {
      title: "SKUs in Catalog",
      value: metrics.totalProducts,
      subtitle: "Active FMCG products",
      icon: Package,
      color: "from-indigo-500 to-violet-600",
      href: "/products",
    },
    {
      title: "Retail Outlets",
      value: metrics.totalRetailers,
      subtitle: "Mapped to beats & distributors",
      icon: Store,
      color: "from-emerald-500 to-teal-600",
      href: "/retailers",
    },
    {
      title: "Distributor Network",
      value: metrics.totalDistributors,
      subtitle: "Stockists & stock points",
      icon: Truck,
      color: "from-amber-500 to-orange-600",
      href: "/distributors",
    },
    {
      title: "Active Beats",
      value: metrics.totalBeats,
      subtitle: "Day-wise route plans",
      icon: MapPin,
      color: "from-purple-500 to-violet-600",
      href: "/beats",
    },
    {
      title: "Active Schemes",
      value: metrics.totalSchemes,
      subtitle: "BOGO & slab trade discounts",
      icon: Tag,
      color: "from-rose-500 to-pink-600",
      href: "/schemes",
    },
    {
      title: "Pipeline Leads",
      value: metrics.totalLeads,
      subtitle: "Distributor & dealer prospects",
      icon: Users,
      color: "from-cyan-500 to-blue-600",
      href: "/leads",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2 sm:mb-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            FMCG SFA & DMS Suite
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">SAssist Field Sales & Distribution Control Center</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Unified ecosystem connecting FMCG manufacturers, field sales officers, stockists, and retail outlets.
            Live on Neon Serverless PostgreSQL.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition"
          >
            <ShoppingCart className="h-4 w-4" />
            Book Order
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
          >
            <PlusCircle className="h-4 w-4" />
            Add SKU
          </Link>
          <Link
            href="/retailers"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition"
          >
            <PlusCircle className="h-4 w-4" />
            Add Retailer
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid - 2 columns on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition group relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500">{card.title}</span>
                <div
                  className={`h-8 w-8 rounded-lg bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-sm`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{card.value}</span>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate">{card.subtitle}</p>
            </Link>
          );
        })}
      </div>

      {/* Two Column Section: Products & Retailers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Featured Catalog SKUs</h2>
            </div>
            <Link href="/products" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              View All ({metrics.totalProducts}) &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">MRP</th>
                  <th className="py-2.5 px-4 text-right">Retailer Price</th>
                  <th className="py-2.5 px-4 text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {p.category.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">₹{p.mrp.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                      ₹{p.retailerPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        {p.stockQuantity} {p.uom}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Retailers Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Mapped Retail Outlets</h2>
            </div>
            <Link href="/retailers" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              View All ({metrics.totalRetailers}) &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Store / Owner</th>
                  <th className="py-2.5 px-4">Assigned Beat</th>
                  <th className="py-2.5 px-4">Distributor</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRetailers.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{r.storeName}</div>
                      <div className="text-[11px] text-slate-500">
                        {r.ownerName} • {r.phone}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                        <MapPin className="h-3 w-3 text-indigo-500" />
                        {r.beat.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="truncate max-w-[150px]">{r.distributor.name}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
