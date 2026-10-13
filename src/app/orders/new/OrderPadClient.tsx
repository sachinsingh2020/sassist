"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSecondaryOrder } from "@/actions/orders";
import { evaluateSchemes } from "@/lib/schemesEngine";
import {
  ShoppingCart,
  Plus,
  Minus,
  Search,
  Store,
  Truck,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  ChevronUp,
  FileText,
  BadgeCheck,
  Send,
  Tag,
  Gift,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface OrderPadClientProps {
  initialRetailer?: any;
  retailers: any[];
  products: any[];
  categories: any[];
  schemes: any[];
  repId: string;
  visitId?: string;
}

export default function OrderPadClient({
  initialRetailer,
  retailers,
  products,
  categories,
  schemes = [],
  repId,
  visitId,
}: OrderPadClientProps) {
  const router = useRouter();

  // Selected Retailer state
  const [selectedRetailerId, setSelectedRetailerId] = useState(
    initialRetailer?.id || retailers[0]?.id || ""
  );

  const selectedRetailer =
    retailers.find((r) => r.id === selectedRetailerId) || initialRetailer || retailers[0];

  // Search & Category filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Cart / Quantities state: map of productId -> quantity
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === "ALL" || p.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Quantity helpers
  const handleQuantityChange = (productId: string, delta: number) => {
    setCartQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const setDirectQuantity = (productId: string, qty: number) => {
    const validQty = Math.max(0, isNaN(qty) ? 0 : qty);
    setCartQuantities((prev) => {
      if (validQty === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: validQty };
    });
  };

  // Cart calculations
  const cartItems = Object.entries(cartQuantities)
    .map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      if (!product || quantity <= 0) return null;
      const unitPrice = product.retailerPrice;
      const lineTotal = unitPrice * quantity;
      return {
        productId: product.id,
        product,
        quantity,
        unitPrice,
        totalPrice: lineTotal,
      };
    })
    .filter(Boolean) as Array<{
    productId: string;
    product: any;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;

  const totalSKUs = cartItems.length;
  const totalUnits = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const grossSubTotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0);

  // Dynamic Scheme Evaluation
  const schemeCartItems = cartItems.map((item) => ({
    productId: item.productId,
    sku: item.product.sku,
    name: item.product.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
  }));

  const schemeEvaluation = evaluateSchemes(schemeCartItems, schemes);
  const schemeDiscount = schemeEvaluation.totalDiscount;
  const freeGoods = schemeEvaluation.freeGoods;
  const appliedSchemes = schemeEvaluation.appliedSchemes;
  const upcomingSchemes = schemeEvaluation.upcomingSchemes;

  const taxableAmount = Math.max(0, grossSubTotal - schemeDiscount);
  const estimatedTax = taxableAmount * 0.18; // 18% GST estimate
  const finalTotal = taxableAmount + estimatedTax;

  // Submit Order
  async function handleSubmitOrder() {
    if (cartItems.length === 0 || !selectedRetailer) return;
    setIsSubmitting(true);

    try {
      const payload = {
        retailerId: selectedRetailer.id,
        distributorId: selectedRetailer.distributorId,
        repId: repId,
        visitId: visitId || undefined,
        items: cartItems.map((item) => {
          const freeMatch = freeGoods.find((f) => f.sku === item.product.sku);
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            freeQty: freeMatch ? freeMatch.freeQty : 0,
          };
        }),
        subTotal: grossSubTotal,
        discount: schemeDiscount,
        taxAmount: estimatedTax,
        totalAmount: finalTotal,
        notes: orderNotes,
      };

      const res = await createSecondaryOrder(payload);
      if (res.success && res.order) {
        setSubmittedOrder(res.order);
        setIsSummaryOpen(false);
      }
    } catch (err: any) {
      alert("Error placing order: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Order Success Screen
  if (submittedOrder) {
    return (
      <div className="max-w-lg mx-auto py-8 px-4 text-center space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-100 space-y-5">
          <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <BadgeCheck className="h-10 w-10" />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
              Secondary Order Placed with Schemes
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-2">
              Order #{submittedOrder.orderNumber}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Routed to fulfilling distributor:{" "}
              <strong className="text-slate-800">{submittedOrder.distributor?.name}</strong>
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Retail Outlet:</span>
              <span className="font-bold text-slate-800">{submittedOrder.retailer?.storeName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Items / Units:</span>
              <span className="font-semibold text-slate-800">
                {submittedOrder.items?.length} SKUs ({totalUnits} Units)
              </span>
            </div>
            {schemeDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Scheme Savings:</span>
                <span>-₹{schemeDiscount.toFixed(2)}</span>
              </div>
            )}
            {freeGoods.length > 0 && (
              <div className="flex justify-between text-rose-600 font-bold">
                <span>Promotional Free Goods:</span>
                <span>
                  {freeGoods.map((f) => `+${f.freeQty} (${f.sku})`).join(", ")}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200/60 pt-2 text-sm">
              <span className="font-bold text-slate-900">Total Net Payable:</span>
              <span className="font-black text-emerald-600">
                ₹{submittedOrder.totalAmount?.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/orders"
              className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              View Orders Register
            </Link>
            <Link
              href="/field"
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Store className="h-4 w-4" />
              Next Counter Visit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-32">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/field"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Beat
        </Link>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          Secondary Order Pad • Schemes Active
        </span>
      </div>

      {/* Retailer & Distributor Context Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Target Counter</span>
              {retailers.length > 1 ? (
                <select
                  value={selectedRetailerId}
                  onChange={(e) => setSelectedRetailerId(e.target.value)}
                  className="font-bold text-sm text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-indigo-600 cursor-pointer block mt-0.5"
                >
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.storeName} ({r.ownerName})
                    </option>
                  ))}
                </select>
              ) : (
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {selectedRetailer?.storeName}
                </h2>
              )}
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedRetailer?.ownerName} • {selectedRetailer?.phone}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2.5 text-xs text-slate-600">
            <Truck className="h-4 w-4 text-amber-500 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                Fulfilling Stockist
              </span>
              <span className="font-bold text-slate-800">
                {selectedRetailer?.distributor?.name || "Direct Factory"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Market Trade Schemes Ticker */}
      {schemes.length > 0 && (
        <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 p-3 rounded-2xl border border-rose-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-6 w-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
              <Tag className="h-3.5 w-3.5" />
            </span>
            <div className="text-slate-800">
              <span className="font-bold">Active Trade Schemes: </span>
              <span className="text-slate-600">
                {schemes.map((s) => s.title).join(" • ")}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-white/80 px-2 py-0.5 rounded-full border border-indigo-200 shrink-0 self-start sm:self-auto">
            Auto-Calculated in Cart
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search SKU name, code, or brand..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === "ALL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product SKU Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredProducts.map((p) => {
          const qty = cartQuantities[p.id] || 0;
          const isSelected = qty > 0;

          // Check if this SKU has an active BOGO scheme
          const bogoScheme = schemes.find(
            (s) => s.type === "BOGO" && s.freeSkuCode === p.sku && s.isActive
          );

          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl p-4 border transition flex flex-col justify-between ${
                isSelected
                  ? "border-indigo-500 ring-2 ring-indigo-500/10 shadow-md bg-indigo-50/10"
                  : "border-slate-200/80 hover:border-slate-300 shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                      {p.sku}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                      {p.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Category: {p.category?.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {p.uom}
                  </span>
                </div>

                {/* Scheme Badge on Product Card */}
                {bogoScheme && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/80">
                    <Gift className="h-3 w-3 text-rose-500" />
                    <span>
                      Deal: Buy {bogoScheme.minOrderQty} Get {bogoScheme.freeSkuQty} Free
                    </span>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Retailer Price</span>
                    <span className="font-black text-slate-900 text-sm">
                      ₹{p.retailerPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">MRP</span>
                    <span className="text-xs text-slate-500 line-through">
                      ₹{p.mrp.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Line Total:{" "}
                  <strong className="text-indigo-600">
                    ₹{(qty * p.retailerPrice).toFixed(2)}
                  </strong>
                </span>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(p.id, -1)}
                    disabled={qty === 0}
                    className="h-7 w-7 rounded-lg bg-white text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs hover:bg-slate-200 disabled:opacity-40 transition active:scale-95"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    value={qty || ""}
                    placeholder="0"
                    onChange={(e) => setDirectQuantity(p.id, parseInt(e.target.value) || 0)}
                    className="w-10 text-center text-xs font-black bg-transparent focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleQuantityChange(p.id, 1)}
                    className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs hover:bg-indigo-700 transition active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Cart Bar (Mobile Sticky) with Live Schemes */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md text-white p-3 sm:p-4 border-t border-slate-800 shadow-2xl">
          <div className="max-w-4xl mx-auto space-y-2">
            {/* Live Scheme Notification Pills in Cart */}
            {appliedSchemes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pb-1 text-[11px]">
                {appliedSchemes.map((s) => (
                  <span
                    key={s.schemeId}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                  >
                    <Sparkles className="h-3 w-3 text-emerald-400" />
                    {s.title}
                    {s.discountAmount > 0 && ` (-₹${s.discountAmount.toFixed(2)})`}
                  </span>
                ))}
                {freeGoods.map((f) => (
                  <span
                    key={f.sku}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30"
                  >
                    <Gift className="h-3 w-3 text-rose-400" />
                    +{f.freeQty} Free ({f.sku})
                  </span>
                ))}
              </div>
            )}

            {/* Upcoming Unlock Alert */}
            {upcomingSchemes.length > 0 && appliedSchemes.length === 0 && (
              <div className="text-[11px] text-amber-300 flex items-center gap-1.5 pb-1">
                <span>💡 Hint:</span>
                <span>
                  Add {upcomingSchemes[0].remainingQty} more units to unlock{" "}
                  <strong>{upcomingSchemes[0].title}</strong>!
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">
                    {totalSKUs} SKUs ({totalUnits} Units)
                  </span>
                  {schemeDiscount > 0 && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full">
                      Saved ₹{schemeDiscount.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="text-base sm:text-lg font-black text-white mt-0.5">
                  ₹{finalTotal.toFixed(2)}{" "}
                  <span className="text-[10px] text-slate-400 font-normal">incl. GST</span>
                </div>
              </div>

              <button
                onClick={() => setIsSummaryOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 flex items-center gap-2"
              >
                <span>Review Order</span>
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Summary & Confirmation Modal */}
      {isSummaryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Checkout Pad
                </span>
                <h2 className="text-base font-bold text-slate-900">Review Secondary Order</h2>
              </div>
              <button
                onClick={() => setIsSummaryOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-700 font-bold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>

            {/* Destination Info */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Retailer:</span>
                <span className="font-bold text-slate-800">{selectedRetailer?.storeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Distributor:</span>
                <span className="font-semibold text-slate-700">
                  {selectedRetailer?.distributor?.name}
                </span>
              </div>
            </div>

            {/* Applied Schemes Section */}
            {appliedSchemes.length > 0 && (
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200/70 space-y-1.5 text-xs">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Active Promotions Applied:
                </div>
                {appliedSchemes.map((s) => (
                  <div key={s.schemeId} className="flex justify-between text-emerald-800 text-[11px]">
                    <span>• {s.title}</span>
                    {s.discountAmount > 0 && (
                      <span className="font-bold">-₹{s.discountAmount.toFixed(2)}</span>
                    )}
                  </div>
                ))}
                {freeGoods.map((f) => (
                  <div key={f.sku} className="flex justify-between text-rose-700 font-bold text-[11px]">
                    <span>🎁 Free Promotional SKU:</span>
                    <span>+{f.freeQty} Units ({f.sku})</span>
                  </div>
                ))}
              </div>
            )}

            {/* Cart Items List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl text-xs"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-slate-800 truncate">{item.product.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.quantity} x ₹{item.unitPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-slate-900">
                      ₹{item.totalPrice.toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.productId, -item.quantity)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Billing Calculation Breakdown with Schemes */}
            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Subtotal ({totalUnits} units):</span>
                <span>₹{grossSubTotal.toFixed(2)}</span>
              </div>
              {schemeDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Trade Scheme Discount:</span>
                  <span>-₹{schemeDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount:</span>
                <span>₹{taxableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Estimated GST (18%):</span>
                <span>₹{estimatedTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                <span>Final Order Value:</span>
                <span className="text-emerald-600 font-black">₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Rep Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Distributor Instructions / Delivery Notes
              </label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Urgent morning delivery requested by retailer..."
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800"
              />
            </div>

            {/* Final Submit Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitOrder}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Transmitting Order...</span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Confirm & Book Order to Stockist</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
