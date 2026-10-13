"use client";

import { useState } from "react";
import { createScheme } from "@/actions/masters";
import {
  Tag,
  Plus,
  Percent,
  Gift,
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";

interface SchemesClientProps {
  initialSchemes: any[];
  products: any[];
}

export default function SchemesClient({ initialSchemes, products }: SchemesClientProps) {
  const [schemes, setSchemes] = useState(initialSchemes);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("PERCENTAGE_DISCOUNT");
  const [minOrderQty, setMinOrderQty] = useState("10");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [flatDiscount, setFlatDiscount] = useState("200");
  const [freeSkuCode, setFreeSkuCode] = useState(products[0]?.sku || "");
  const [freeSkuQty, setFreeSkuQty] = useState("1");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("2026-12-31");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await createScheme({
        title,
        code,
        description,
        type,
        minOrderQty: parseInt(minOrderQty) || 1,
        discountPercent: type === "PERCENTAGE_DISCOUNT" ? parseFloat(discountPercent) : 0,
        flatDiscount: type === "FLAT_DISCOUNT" ? parseFloat(flatDiscount) : 0,
        freeSkuCode: type === "BOGO" ? freeSkuCode : undefined,
        freeSkuQty: type === "BOGO" ? parseInt(freeSkuQty) : 0,
        startDate,
        endDate,
      });

      if (res.success && res.scheme) {
        setSchemes([res.scheme, ...schemes]);
        setMessage("Trade promotion scheme activated successfully!");
        setIsModalOpen(false);
        // Reset form
        setTitle("");
        setCode("");
        setDescription("");
      }
    } catch (err: any) {
      alert("Error creating scheme: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="h-5 w-5 text-rose-600" />
            Trade Schemes & Dynamic Pricing Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure volume slab discounts, promotional BOGO free goods, and special retailer trade offers.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          Create Trade Scheme
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schemes.map((s) => (
          <div
            key={s.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200/60">
                  {s.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">{s.title}</h3>
                {s.description && <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>}
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Active
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {s.type === "BOGO" ? (
                  <Gift className="h-4 w-4 text-rose-500 shrink-0" />
                ) : (
                  <Percent className="h-4 w-4 text-indigo-500 shrink-0" />
                )}
                <span className="font-semibold text-slate-800">
                  {s.type === "BOGO"
                    ? `Buy ${s.minOrderQty} Qty -> Get ${s.freeSkuQty} Free (${s.freeSkuCode})`
                    : s.type === "FLAT_DISCOUNT"
                    ? `Min ${s.minOrderQty} Qty -> Flat ₹${s.flatDiscount} Off`
                    : `Min ${s.minOrderQty} Qty -> ${s.discountPercent}% Flat Trade Discount`}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                Valid through {new Date(s.endDate).toLocaleDateString()}
              </span>
              <span className="font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                Live in Order Pad
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Scheme Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-rose-600" />
              Activate New Trade Scheme
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scheme Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Summer Bonanza: 12% off on 25+ boxes"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scheme Code</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. SCHEME-SUMMER-12"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scheme Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="PERCENTAGE_DISCOUNT">Percentage Slab Discount</option>
                    <option value="BOGO">BOGO (Buy X Get Y Free)</option>
                    <option value="FLAT_DISCOUNT">Flat Cash Discount</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Order Qty (Slab)</label>
                  <input
                    type="number"
                    required
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                {type === "PERCENTAGE_DISCOUNT" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Discount Percent (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      placeholder="10.0"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                )}

                {type === "FLAT_DISCOUNT" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Flat Discount (₹)</label>
                    <input
                      type="number"
                      required
                      value={flatDiscount}
                      onChange={(e) => setFlatDiscount(e.target.value)}
                      placeholder="200"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                )}

                {type === "BOGO" && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Free Item SKU</label>
                      <select
                        value={freeSkuCode}
                        onChange={(e) => setFreeSkuCode(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.sku}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Free Units Qty</label>
                      <input
                        type="number"
                        required
                        value={freeSkuQty}
                        onChange={(e) => setFreeSkuQty(e.target.value)}
                        placeholder="1"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Market Rules</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Valid across all general trade retailers in North zone"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Activating..." : "Save & Activate Scheme"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
