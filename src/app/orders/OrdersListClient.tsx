"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  Store,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";

interface OrdersListClientProps {
  orders: any[];
}

export default function OrdersListClient({ orders }: OrdersListClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.retailer?.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.distributor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.rep?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleExpand = (id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Secondary Sales Orders Register
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time feed of field orders captured by sales reps at retail counters and routed to mapped stockists.
          </p>
        </div>

        <Link
          href="/orders/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          Take New Order
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Order #, Retailer, Stockist..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none text-slate-700"
          >
            <option value="ALL">All Order Statuses ({orders.length})</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="DELIVERED">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          const orderDate = new Date(order.createdAt);
          const totalUnits = order.items.reduce((acc: number, it: any) => acc + it.quantity, 0);

          return (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition overflow-hidden"
            >
              <div
                onClick={() => toggleExpand(order.id)}
                className="p-4 cursor-pointer hover:bg-slate-50/50 transition flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                {/* Order ID & Retailer */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {order.orderNumber}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> {order.status}
                      </span>
                      {order.discount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Scheme: -₹{order.discount.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      {order.retailer?.storeName}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Booked by: <span className="font-medium text-slate-700">{order.rep?.name}</span>{" "}
                      • {orderDate.toLocaleDateString()} at{" "}
                      {orderDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                {/* Stockist, Items count & Value */}
                <div className="flex items-center justify-between lg:justify-end gap-6 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="text-left lg:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Fulfilling Stockist
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {order.distributor?.name}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Order Value
                    </span>
                    <span className="text-sm font-black text-emerald-600">
                      ₹{order.totalAmount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {order.items.length} SKUs ({totalUnits} Units)
                    </span>
                  </div>

                  <button className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition shrink-0">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Expandable Line Items Breakdown */}
              {isExpanded && (
                <div className="bg-slate-50/80 p-4 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Itemized SKU Breakdown</span>
                    <span className="text-[11px] text-slate-500">GST Rate Applied: 18%</span>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200 text-[10px]">
                        <tr>
                          <th className="py-2 px-3">SKU</th>
                          <th className="py-2 px-3">Product Name</th>
                          <th className="py-2 px-3 text-right">Qty</th>
                          <th className="py-2 px-3 text-right">Retailer Price</th>
                          <th className="py-2 px-3 text-right">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {order.items.map((it: any) => (
                          <tr key={it.id}>
                            <td className="py-2 px-3 font-mono font-semibold text-indigo-600 text-[11px]">
                              {it.product?.sku}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-800">
                              {it.product?.name}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              {it.quantity} {it.product?.uom}
                              {it.freeQty > 0 && (
                                <span className="ml-1.5 text-[9px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1 py-0.5 rounded">
                                  +{it.freeQty} Free
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">
                              ₹{it.unitPrice.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              ₹{it.totalPrice.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {order.notes && (
                    <div className="text-xs bg-amber-50 text-amber-800 p-2.5 rounded-lg border border-amber-200">
                      <strong>Delivery Instructions:</strong> {order.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
            <Package className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No secondary orders found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Sales reps can book orders directly while visiting retail counters or using the New Order pad.
            </p>
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="h-4 w-4" />
              Book First Order
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
