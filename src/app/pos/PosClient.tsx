"use client";

import { useState } from "react";
import { createPosTransaction, createPromoterLog } from "@/actions/pos";
import {
  CreditCard,
  QrCode,
  Banknote,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  Sparkles,
  ShoppingBag,
  Store,
  PauseCircle,
  PlayCircle,
  Receipt,
  UserCheck,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";

interface PosClientProps {
  initialData: {
    products: any[];
    recentTransactions: any[];
    promoterLogs: any[];
    stats: {
      totalBills: number;
      totalPosRevenue: number;
    };
  };
}

export default function PosClient({ initialData }: PosClientProps) {
  const [data, setData] = useState(initialData);
  const [activeMode, setActiveMode] = useState<"TERMINAL" | "PROMOTER">("TERMINAL");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("UPI");
  const [heldBills, setHeldBills] = useState<Array<{ id: string; cart: Record<string, number>; customer: string }>>([]);
  const [completedBill, setCompletedBill] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Promoter states
  const [promoterName, setPromoterName] = useState("Priya Sharma (BA)");
  const [storeName, setStoreName] = useState("Metro Hypermarket Counter");
  const [walkIns, setWalkIns] = useState("45");
  const [interactions, setInteractions] = useState("28");
  const [salesUnits, setSalesUnits] = useState("14");
  const [salesValue, setSalesValue] = useState("1200");
  const [promoterFeedback, setPromoterFeedback] = useState("");
  const [promoterSuccessMsg, setPromoterSuccessMsg] = useState<string | null>(null);

  const products = data.products;
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQtyChange = (productId: string, delta: number) => {
    setCart((prev) => {
      const curr = prev[productId] || 0;
      const next = Math.max(0, curr + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  // Cart Totals
  const cartItems = Object.entries(cart)
    .map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      if (!product || quantity <= 0) return null;
      const unitPrice = product.mrp;
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
      };
    })
    .filter(Boolean) as any[];

  const subTotal = cartItems.reduce((acc, it) => acc + it.totalPrice, 0);
  const taxAmount = subTotal * 0.18;
  const grandTotal = subTotal + taxAmount;

  // Hold Bill
  const handleHoldBill = () => {
    if (cartItems.length === 0) return;
    setHeldBills([
      ...heldBills,
      {
        id: `HOLD-${Date.now().toString().slice(-4)}`,
        cart: { ...cart },
        customer: customerName || "Counter Guest",
      },
    ]);
    setCart({});
    setCustomerName("");
    setCustomerPhone("");
  };

  // Recall Bill
  const handleRecallBill = (held: any) => {
    setCart(held.cart);
    setCustomerName(held.customer === "Counter Guest" ? "" : held.customer);
    setHeldBills(heldBills.filter((h) => h.id !== held.id));
  };

  // Checkout Bill
  async function handleCheckout() {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);

    try {
      const res = await createPosTransaction({
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        paymentMethod,
        subTotal,
        taxAmount,
        totalAmount: grandTotal,
        items: cartItems,
      });

      if (res.success && res.transaction) {
        setCompletedBill(res.transaction);
        setCart({});
        setCustomerName("");
        setCustomerPhone("");
      }
    } catch (e: any) {
      alert("Error processing bill: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Promoter Log Submit
  async function handlePromoterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setPromoterSuccessMsg(null);

    try {
      const res = await createPromoterLog({
        promoterName,
        storeName,
        walkIns: parseInt(walkIns) || 0,
        interactions: parseInt(interactions) || 0,
        salesUnits: parseInt(salesUnits) || 0,
        salesValue: parseFloat(salesValue) || 0,
        feedback: promoterFeedback,
      });

      if (res.success && res.log) {
        setData((prev) => ({
          ...prev,
          promoterLogs: [res.log, ...prev.promoterLogs],
        }));
        setPromoterSuccessMsg("Promoter daily shift activity saved!");
        setPromoterFeedback("");
      }
    } catch (e: any) {
      alert("Error submitting promoter log: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* POS Top Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-indigo-600" />
            Mobile POS & In-Store Promoter Terminal
          </h1>
          <p className="text-xs text-slate-500">
            Rapid checkout terminal for modern trade kiosks, pop-ups, and brand beauty advisors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMode("TERMINAL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === "TERMINAL"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Receipt className="h-4 w-4" />
            m-POS Billing
          </button>
          <button
            onClick={() => setActiveMode("PROMOTER")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeMode === "PROMOTER"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Promoter / BA Mode
          </button>
        </div>
      </div>

      {/* MODE 1: TERMINAL BILLING */}
      {activeMode === "TERMINAL" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Product Selection Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Search bar */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Scan Barcode or Search SKU..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-xs"
              />
            </div>

            {/* Held Bills Pills (Queue Buster) */}
            {heldBills.length > 0 && (
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 flex items-center gap-2 overflow-x-auto text-xs">
                <span className="font-bold text-amber-900 shrink-0 flex items-center gap-1">
                  <PauseCircle className="h-3.5 w-3.5 text-amber-600" /> Held Bills:
                </span>
                {heldBills.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => handleRecallBill(h)}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-bold text-slate-800 shrink-0 transition flex items-center gap-1"
                  >
                    <PlayCircle className="h-3 w-3 text-amber-600" />
                    {h.customer} ({h.id})
                  </button>
                ))}
              </div>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const qty = cart[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleQtyChange(p.id, 1)}
                    className={`bg-white rounded-xl p-3 border cursor-pointer select-none transition flex flex-col justify-between hover:border-indigo-400 hover:shadow-xs ${
                      qty > 0
                        ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20"
                        : "border-slate-200"
                    }`}
                  >
                    <div>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold block w-fit">
                        {p.sku}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug line-clamp-2">
                        {p.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900">₹{p.mrp.toFixed(2)}</span>
                      {qty > 0 && (
                        <span className="h-5 w-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                          {qty}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Checkout Pad & Cart (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Receipt className="h-4 w-4 text-indigo-600" /> Current Bill
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleHoldBill}
                    disabled={cartItems.length === 0}
                    className="text-[11px] px-2 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 font-semibold hover:bg-amber-100 transition disabled:opacity-40"
                  >
                    Hold Bill
                  </button>
                  <button
                    onClick={() => setCart({})}
                    disabled={cartItems.length === 0}
                    className="text-[11px] text-rose-500 hover:text-rose-700 font-bold"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Customer Inputs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Customer Name (Optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="Mobile (For SMS Bill)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                />
              </div>

              {/* Cart Items List */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {cartItems.map((it) => (
                  <div
                    key={it.productId}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-xl text-xs"
                  >
                    <div className="truncate pr-2">
                      <div className="font-bold text-slate-900 truncate">{it.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ₹{it.unitPrice.toFixed(2)} x {it.quantity}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                        <button
                          onClick={() => handleQtyChange(it.productId, -1)}
                          className="h-5 w-5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-xs">{it.quantity}</span>
                        <button
                          onClick={() => handleQtyChange(it.productId, 1)}
                          className="h-5 w-5 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="font-black text-slate-900 text-xs w-14 text-right">
                        ₹{it.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}

                {cartItems.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    Tap items on the left to add to bill
                  </div>
                )}
              </div>
            </div>

            {/* Payment & Totals */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              {/* Payment Mode Selector */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("UPI")}
                  className={`py-2 rounded-xl font-bold flex flex-col items-center gap-1 border transition ${
                    paymentMethod === "UPI"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <QrCode className="h-4 w-4" />
                  <span>UPI QR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`py-2 rounded-xl font-bold flex flex-col items-center gap-1 border transition ${
                    paymentMethod === "CASH"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <Banknote className="h-4 w-4" />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CARD")}
                  className={`py-2 rounded-xl font-bold flex flex-col items-center gap-1 border transition ${
                    paymentMethod === "CARD"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Card / POS</span>
                </button>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>₹{subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST (18%):</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-1.5">
                  <span>Total Payable:</span>
                  <span className="text-emerald-600">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                disabled={cartItems.length === 0 || isSubmitting}
                onClick={handleCheckout}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md transition disabled:opacity-40"
              >
                {isSubmitting ? "Generating Receipt..." : `Collect ₹${grandTotal.toFixed(2)} & Print Receipt`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: IN-STORE PROMOTER SHIFT ACTIVITY */}
      {activeMode === "PROMOTER" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Shift Logging Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                Daily Promoter / Beauty Advisor Shift Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Record in-store counter customer interactions, walk-ins, and direct consumer conversions.
              </p>
            </div>

            {promoterSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {promoterSuccessMsg}
              </div>
            )}

            <form onSubmit={handlePromoterSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Promoter Name</label>
                  <input
                    type="text"
                    required
                    value={promoterName}
                    onChange={(e) => setPromoterName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Store / Counter</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Store Footfall / Walk-ins</label>
                  <input
                    type="number"
                    required
                    value={walkIns}
                    onChange={(e) => setWalkIns(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sampling Pitch Interactions</label>
                  <input
                    type="number"
                    required
                    value={interactions}
                    onChange={(e) => setInteractions(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Units Sold</label>
                  <input
                    type="number"
                    required
                    value={salesUnits}
                    onChange={(e) => setSalesUnits(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Sales Value (₹)</label>
                  <input
                    type="number"
                    required
                    value={salesValue}
                    onChange={(e) => setSalesValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Feedback / Objections</label>
                <textarea
                  rows={2}
                  value={promoterFeedback}
                  onChange={(e) => setPromoterFeedback(e.target.value)}
                  placeholder="e.g. Customers loved the orange sparkling flavour, requested 1L bottle sizes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition"
              >
                {isSubmitting ? "Logging..." : "Submit Shift Activity Log"}
              </button>
            </form>
          </div>

          {/* Activity Log Feed */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              Recent Promoter Logs
            </h3>
            <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
              {data.promoterLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{log.promoterName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">{log.storeName}</div>
                  <div className="flex items-center gap-3 text-[11px] pt-1 border-t border-slate-200/60 font-medium">
                    <span>Walk-ins: <strong>{log.walkIns}</strong></span>
                    <span>Pitches: <strong>{log.interactions}</strong></span>
                    <span className="text-emerald-600 font-bold">Sales: ₹{log.salesValue}</span>
                  </div>
                </div>
              ))}
              {data.promoterLogs.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  No promoter shift logs recorded yet today.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POS Receipt Modal */}
      {completedBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="text-center space-y-1 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-1">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Payment Successful</h3>
              <p className="text-[10px] font-mono font-bold text-slate-500">
                {completedBill.billNumber}
              </p>
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-bold text-slate-900">{completedBill.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{new Date(completedBill.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
                <span>Total Paid:</span>
                <span className="text-emerald-600">₹{completedBill.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Receipt
              </button>
              <button
                onClick={() => setCompletedBill(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
              >
                Next Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
