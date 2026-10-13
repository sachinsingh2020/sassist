"use client";

import { Printer, X, Building2, Store, CheckCircle2 } from "lucide-react";

interface GstInvoiceModalProps {
  order: any;
  distributor: any;
  onClose: () => void;
}

export default function GstInvoiceModal({ order, distributor, onClose }: GstInvoiceModalProps) {
  const invoiceNumber = order.orderNumber.replace("ORD", "INV");
  const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const subTotal = order.subTotal || 0;
  const discount = order.discount || 0;
  const taxableValue = Math.max(0, subTotal - discount);
  const cgstAmount = (taxableValue * 0.09); // 9% CGST
  const sgstAmount = (taxableValue * 0.09); // 9% SGST
  const totalTax = cgstAmount + sgstAmount;
  const grandTotal = taxableValue + totalTax;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-5 my-8">
        {/* Top Action Bar (hidden in print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Official Tax Invoice
            </span>
            <span className="text-xs font-mono font-semibold text-slate-500">
              #{invoiceNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="border border-slate-300 rounded-xl p-5 space-y-4 text-xs font-sans">
          {/* Header */}
          <div className="text-center border-b border-slate-200 pb-3">
            <h1 className="text-base font-black tracking-tight uppercase text-slate-900">
              Tax Invoice / Secondary Sales Bill
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
              (Issued under Section 31 of CGST Act, 2017)
            </p>
          </div>

          {/* Supplier & Consignee Details */}
          <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
            {/* Supplier / Distributor */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Supplier (Stockist / Distributor):
              </span>
              <h3 className="font-black text-slate-900 text-sm leading-tight">
                {distributor.name}
              </h3>
              <p className="text-slate-600 text-[11px] leading-relaxed">{distributor.address}</p>
              <div className="pt-1 font-mono text-[11px]">
                <strong className="text-slate-700">GSTIN: </strong>
                <span className="font-bold text-indigo-700">{distributor.gstin || "07AAAAA0000A1Z5"}</span>
              </div>
              <div className="text-slate-500 text-[10px]">
                State: {distributor.territory?.state || "Delhi"} | State Code: 07
              </div>
            </div>

            {/* Consignee / Retailer */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Billed To (Retailer / Outlet):
              </span>
              <h3 className="font-black text-slate-900 text-sm leading-tight">
                {order.retailer?.storeName}
              </h3>
              <p className="text-slate-600 text-[11px] leading-relaxed">{order.retailer?.address}</p>
              <p className="text-slate-600 text-[11px]">
                Proprietor: {order.retailer?.ownerName} • {order.retailer?.phone}
              </p>
              <div className="pt-1 font-mono text-[11px]">
                <strong className="text-slate-700">GSTIN: </strong>
                <span>{order.retailer?.gstin || "URP (Unregistered Dealer)"}</span>
              </div>
            </div>
          </div>

          {/* Invoice Meta Grid */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">Invoice No.</span>
              <span className="font-mono font-bold text-slate-900">{invoiceNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">Invoice Date</span>
              <span className="font-medium text-slate-900">{invoiceDate}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">Order Ref</span>
              <span className="font-mono text-slate-700">{order.orderNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-semibold">Booked By</span>
              <span className="text-slate-900 font-medium">{order.rep?.name || "Field Rep"}</span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5 text-center">#</th>
                  <th className="py-2 px-2.5">Item Description</th>
                  <th className="py-2 px-2 text-center">HSN</th>
                  <th className="py-2 px-2 text-right">Billed</th>
                  <th className="py-2 px-2 text-right">Free</th>
                  <th className="py-2 px-2.5 text-right">Rate (₹)</th>
                  <th className="py-2 px-2.5 text-right">Taxable (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((it: any, idx: number) => (
                  <tr key={it.id}>
                    <td className="py-2 px-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-2.5">
                      <div className="font-bold text-slate-900">{it.product?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">SKU: {it.product?.sku}</div>
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-slate-600">
                      {it.product?.hsnCode || "2202"}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-slate-900">
                      {it.quantity} {it.product?.uom}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {it.freeQty > 0 ? (
                        <span className="font-bold text-rose-600 font-mono">+{it.freeQty}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-right text-slate-700">
                      ₹{it.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-slate-900">
                      ₹{it.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax & Total Calculation Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-72 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Gross Value:</span>
                <span>₹{subTotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Trade Scheme Discount:</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-100 pt-1">
                <span>Taxable Amount:</span>
                <span>₹{taxableValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>CGST (9.0%):</span>
                <span>₹{cgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>SGST (9.0%):</span>
                <span>₹{sgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 border-t-2 border-slate-900 pt-1.5">
                <span>Total Invoice Value:</span>
                <span className="text-emerald-700 font-black">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500">
            <div>
              <p>• Goods once sold will not be taken back without authorization.</p>
              <p>• Subject to local territorial jurisdiction.</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-800">For {distributor.name}</p>
              <div className="h-10"></div>
              <p className="border-t border-slate-300 pt-0.5 font-semibold text-slate-600">
                Authorized Signatory
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
