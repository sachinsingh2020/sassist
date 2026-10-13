"use client";

import { useState } from "react";
import { createRetailer } from "@/actions/masters";
import { Store, Plus, Search, Filter, MapPin, CheckCircle2, Phone, User } from "lucide-react";

interface RetailerClientProps {
  initialRetailers: any[];
  beats: any[];
  distributors: any[];
}

export default function RetailerClient({
  initialRetailers,
  beats,
  distributors,
}: RetailerClientProps) {
  const [retailers, setRetailers] = useState(initialRetailers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBeat, setSelectedBeat] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form states
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [beatId, setBeatId] = useState(beats[0]?.id || "");
  const [distributorId, setDistributorId] = useState(distributors[0]?.id || "");
  const [lat, setLat] = useState("28.6315");
  const [lng, setLng] = useState("77.2167");

  const filteredRetailers = retailers.filter((r) => {
    const matchesSearch =
      r.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone.includes(searchTerm);
    const matchesBeat = selectedBeat === "ALL" || r.beatId === selectedBeat;
    return matchesSearch && matchesBeat;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await createRetailer({
        storeName,
        ownerName,
        phone,
        address,
        gstin,
        beatId,
        distributorId,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      });

      if (res.success && res.retailer) {
        setRetailers([res.retailer, ...retailers]);
        setMessage("Retail store onboarded successfully!");
        setIsModalOpen(false);
        // Reset form
        setStoreName("");
        setOwnerName("");
        setPhone("");
        setAddress("");
        setGstin("");
      }
    } catch (err: any) {
      setMessage("Error creating retailer: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="h-5 w-5 text-emerald-600" />
            Retail Outlets & Stores Master
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Directory of retail touchpoints mapped to route beats, stockist distributors, and GPS coordinates for field check-in.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          Onboard New Retailer
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search store name, owner, or phone..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedBeat}
            onChange={(e) => setSelectedBeat(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none text-slate-700"
          >
            <option value="ALL">All Route Beats ({retailers.length})</option>
            {beats.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.dayOfWeek})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Retailers Grid/Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Store Name</th>
                <th className="py-3 px-4">Owner / Contact</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Mapped Beat</th>
                <th className="py-3 px-4">Fulfilling Distributor</th>
                <th className="py-3 px-4 text-center">GPS Tagged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRetailers.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{r.storeName}</div>
                    {r.gstin && <div className="text-[10px] text-slate-400 font-mono">GST: {r.gstin}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                      <User className="h-3 w-3 text-slate-400" />
                      {r.ownerName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {r.phone}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{r.address}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium text-[11px]">
                      <MapPin className="h-3 w-3 text-indigo-500" />
                      {r.beat?.name || "Unassigned"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {r.distributor?.name || "Direct Factory"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {r.lat && r.lng ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Pending GPS</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRetailers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No retail outlets found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard Retailer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-600" />
              Onboard New Retail Store
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Store / Shop Name</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g. Mahavir Provisions"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Sanjay Mahavir"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98000 00000"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Store Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Shop number, Market name, City"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="07AAAAA0000A1Z5"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Route Beat</label>
                  <select
                    value={beatId}
                    onChange={(e) => setBeatId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  >
                    {beats.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.dayOfWeek})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fulfilling Distributor
                  </label>
                  <select
                    value={distributorId}
                    onChange={(e) => setDistributorId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  >
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude (GPS)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Longitude (GPS)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Onboard Outlet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
