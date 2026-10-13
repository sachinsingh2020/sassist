"use client";

import { useState } from "react";
import {
  updateDistributorOrderStatus,
  restockDistributorProduct,
} from "@/actions/distributor";
import GstInvoiceModal from "@/components/GstInvoiceModal";
import {
  Truck,
  Package,
  FileText,
  Clock,
  CheckCircle2,
  Building2,
  Store,
  ChevronRight,
  Plus,
  RefreshCw,
  Printer,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

interface DistributorPortalClientProps {
  initialData: {
    distributor: any;
    stats: {
      totalOrders: number;
      pendingOrdersCount: number;
      confirmedOrdersCount: number;
      dispatchedOrdersCount: number;
      totalRevenue: number;
      mappedRetailersCount: number;
    };
    orders: any[];
    products: any[];
  };
}

export default function DistributorPortalClient({
  initialData,
}: DistributorPortalClientProps) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<"ORDERS" | "INVENTORY">("ORDERS");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Restock modal state
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedRestockProduct, setSelectedRestockProduct] = useState<any | null>(null);
  const [restockQty, setRestockQty] = useState("50");

  const orders = data.orders;
  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "ALL") return true;
    return o.status === statusFilter;
  });

  async function handleStatusChange(orderId: string, newStatus: any) {
    setIsProcessing(true);
    try {
      const res = await updateDistributorOrderStatus(orderId, newStatus);
      if (res.success) {
        // Update local order state
        setData((prev) => ({
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === orderId ? { ...o, status: newStatus } : o
          ),
          stats: {
            ...prev.stats,
            pendingOrdersCount:
              newStatus === "CONFIRMED"
                ? Math.max(0, prev.stats.pendingOrdersCount - 1)
                : prev.stats.pendingOrdersCount,
            dispatchedOrdersCount:
              newStatus === "DISPATCHED"
                ? prev.stats.dispatchedOrdersCount + 1
                : prev.stats.dispatchedOrdersCount,
          },
        }));
      }
    } catch (e: any) {
      alert("Error updating order: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRestockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRestockProduct) return;
    setIsProcessing(true);

    try {
      const res = await restockDistributorProduct(
        selectedRestockProduct.id,
        parseInt(restockQty) || 50
      );
      if (res.success && res.product) {
        setData((prev) => ({
          ...prev,
          products: prev.products.map((p) =>
            p.id === res.product.id ? { ...p, stockQuantity: res.product.stockQuantity } : p
          ),
        }));
        setIsRestockModalOpen(false);
      }
    } catch (e: any) {
      alert("Failed to restock: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Distributor Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/80 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              Distributor Management System (DMS) Live
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {data.distributor.name}
            </h1>
            <p className="text-xs text-slate-300 flex items-center gap-2">
              <span>Code: <strong className="font-mono text-white">{data.distributor.code}</strong></span>
              <span>•</span>
              <span>GSTIN: <strong className="font-mono text-amber-400">{data.distributor.gstin || "07AAAAA0000A1Z5"}</strong></span>
            </p>
            <p className="text-[11px] text-slate-400 max-w-xl truncate">
              Warehouse: {data.distributor.address}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("ORDERS")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "ORDERS"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <FileText className="h-4 w-4" />
              Incoming Orders ({data.orders.length})
            </button>
            <button
              onClick={() => setActiveTab("INVENTORY")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "INVENTORY"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Package className="h-4 w-4" />
              Warehouse Stock ({data.products.length})
            </button>
          </div>
        </div>

        {/* Distributor Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 p-3 rounded-2xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Pending Orders
            </span>
            <span className="text-xl font-black text-amber-400 mt-0.5 block">
              {data.stats.pendingOrdersCount}
            </span>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Dispatched / Delivered
            </span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block">
              {data.stats.dispatchedOrdersCount}
            </span>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Mapped Retailers
            </span>
            <span className="text-xl font-black text-white mt-0.5 block">
              {data.stats.mappedRetailersCount} Outlets
            </span>
          </div>

          <div className="bg-white/5 p-3 rounded-2xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Secondary Revenue
            </span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block">
              ₹{data.stats.totalRevenue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* TAB 1: ORDERS FULFILLMENT QUEUE */}
      {activeTab === "ORDERS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Truck className="h-4 w-4 text-indigo-600" />
                Secondary Orders Fulfillment Queue
              </h2>
              <p className="text-xs text-slate-500">
                Confirm incoming field bookings, generate GST tax invoices, and dispatch goods to retail counters.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none text-slate-700"
              >
                <option value="ALL">All Order States ({orders.length})</option>
                <option value="SUBMITTED">Pending Confirmation</option>
                <option value="CONFIRMED">Confirmed (Ready to Dispatch)</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="DELIVERED">Delivered</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const totalUnits = order.items.reduce((acc: number, it: any) => acc + it.quantity, 0);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0">
                        <Store className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {order.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              order.status === "SUBMITTED"
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : order.status === "CONFIRMED"
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : order.status === "DISPATCHED"
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 mt-1">
                          {order.retailer?.storeName}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {order.retailer?.ownerName} • {order.retailer?.address}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Net Amount
                      </span>
                      <span className="text-base font-black text-emerald-600">
                        ₹{order.totalAmount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {order.items.length} SKUs ({totalUnits} Units)
                      </span>
                    </div>
                  </div>

                  {/* Line Items Preview */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((it: any) => (
                        <span
                          key={it.id}
                          className="bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-700 text-[11px] font-medium"
                        >
                          {it.product?.name}: <strong>{it.quantity} {it.product?.uom}</strong>
                          {it.freeQty > 0 && (
                            <span className="text-rose-600 font-bold ml-1">
                              (+{it.freeQty} Free)
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Distributor Actions */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedInvoiceOrder(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-500" />
                      View GST Tax Invoice
                    </button>

                    <div className="flex items-center gap-2">
                      {order.status === "SUBMITTED" && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(order.id, "CONFIRMED")}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs"
                        >
                          Confirm Order
                        </button>
                      )}

                      {order.status === "CONFIRMED" && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(order.id, "DISPATCHED")}
                          className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          Generate Invoice & Dispatch
                        </button>
                      )}

                      {order.status === "DISPATCHED" && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleStatusChange(order.id, "DELIVERED")}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                No orders found in this status queue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WAREHOUSE INVENTORY & STOCK */}
      {activeTab === "INVENTORY" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-600" />
                Warehouse Stock Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Track current physical inventory. Stock is automatically decremented upon dispatching secondary orders.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">SKU Code</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Landing Price (₹)</th>
                    <th className="py-3 px-4 text-right">Stock Available</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.products.map((p) => {
                    const isLowStock = p.stockQuantity < 100;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          {p.sku}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{p.name}</td>
                        <td className="py-3 px-4 text-slate-600">{p.category?.name}</td>
                        <td className="py-3 px-4 text-right text-slate-700 font-medium">
                          ₹{p.distributorPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-black px-2.5 py-0.5 rounded-full text-xs ${
                              isLowStock
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {p.stockQuantity} {p.uom}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedRestockProduct(p);
                              setIsRestockModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition inline-flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Restock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {isRestockModalOpen && selectedRestockProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Receive Factory Goods: {selectedRestockProduct.name}
            </h3>
            <form onSubmit={handleRestockSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Received from Factory ({selectedRestockProduct.uom})
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-sm"
                >
                  {isProcessing ? "Updating..." : "Add to Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GST Tax Invoice Modal */}
      {selectedInvoiceOrder && (
        <GstInvoiceModal
          order={selectedInvoiceOrder}
          distributor={data.distributor}
          onClose={() => setSelectedInvoiceOrder(null)}
        />
      )}
    </div>
  );
}
