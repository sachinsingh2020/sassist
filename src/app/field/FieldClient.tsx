"use client";

import { useState, useEffect } from "react";
import { checkInOutlet, checkOutOutlet } from "@/actions/visits";
import {
  MapPin,
  Navigation,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Building2,
  Store,
  ChevronRight,
  ArrowRight,
  Sparkles,
  RefreshCw,
  LogOut,
  Calendar,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";

interface FieldClientProps {
  initialData: {
    rep: { id: string; name: string; email: string; phone: string | null };
    beats: any[];
    stats: { totalOutlets: number; visitedOutlets: number; coveragePercent: number };
    activeVisit: any | null;
  };
}

// Calculate distance between two lat/lng coordinates in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function FieldClient({ initialData }: FieldClientProps) {
  const [data, setData] = useState(initialData);
  const [selectedBeatIndex, setSelectedBeatIndex] = useState(0);
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Active Visit Tracking
  const [activeVisit, setActiveVisit] = useState<any | null>(initialData.activeVisit);
  const [visitTimer, setVisitTimer] = useState(0);

  // Check-Out Modal
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [checkOutOutletData, setCheckOutOutletData] = useState<any | null>(null);
  const [noOrderReason, setNoOrderReason] = useState("SUFFICIENT_STOCK");
  const [visitNotes, setVisitNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeBeat = data.beats[selectedBeatIndex] || null;
  const outlets = activeBeat?.retailers || [];

  // Request GPS on mount
  useEffect(() => {
    requestGpsLocation();
  }, []);

  // Timer for active check-in
  useEffect(() => {
    let interval: any;
    if (activeVisit) {
      const startTime = new Date(activeVisit.checkIn).getTime();
      interval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        setVisitTimer(elapsedSeconds > 0 ? elapsedSeconds : 0);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeVisit]);

  function requestGpsLocation() {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser.");
      // Fallback coordinates for demo (Connaught Place area)
      setCurrentGps({ lat: 28.6315, lng: 77.2167 });
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsLoading(false);
      },
      (err) => {
        // Fallback for demo in case user blocks browser prompt
        setCurrentGps({ lat: 28.6315, lng: 77.2167 });
        setGpsError("Simulated GPS active (browser permission not granted)");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleCheckIn(outlet: any) {
    setIsSubmitting(true);
    try {
      const res = await checkInOutlet({
        retailerId: outlet.id,
        beatId: activeBeat.id,
        repId: data.rep.id,
        lat: currentGps?.lat,
        lng: currentGps?.lng,
      });

      if (res.success && res.visit) {
        setActiveVisit(res.visit);
        // update local outlet state
        outlet.visits = [res.visit];
      }
    } catch (e: any) {
      alert("Failed to check in: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCompleteVisit(status: "COMPLETED" | "NO_ORDER") {
    if (!activeVisit) return;
    setIsSubmitting(true);

    try {
      const res = await checkOutOutlet({
        visitId: activeVisit.id,
        status: status,
        noOrderReason: status === "NO_ORDER" ? noOrderReason : undefined,
        notes: visitNotes,
      });

      if (res.success) {
        setIsCheckOutModalOpen(false);
        setActiveVisit(null);
        setVisitNotes("");
        // Update stats
        setData((prev) => ({
          ...prev,
          stats: {
            ...prev.stats,
            visitedOutlets: prev.stats.visitedOutlets + 1,
            coveragePercent: Math.round(
              ((prev.stats.visitedOutlets + 1) / prev.stats.totalOutlets) * 100
            ),
          },
        }));
        // Reload location
        window.location.reload();
      }
    } catch (e: any) {
      alert("Failed to complete visit: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-12">
      {/* Field Rep Header Banner */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-4 sm:p-5 text-white shadow-xl border border-indigo-900/50">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Field Rep Mode Active
            </div>
            <h1 className="text-lg sm:text-xl font-bold mt-1 text-white">{data.rep.name}</h1>
            <p className="text-xs text-indigo-200/80">Assigned Territory: Delhi-NCR Central</p>
          </div>

          {/* Refresh GPS Button */}
          <button
            onClick={requestGpsLocation}
            disabled={gpsLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-medium border border-white/15 transition shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${gpsLoading ? "animate-spin" : ""}`} />
            <span>{currentGps ? "GPS Fixed" : "Fix GPS"}</span>
          </button>
        </div>

        {/* GPS Live Coordinates Banner */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-[11px] text-indigo-200">
          <div className="flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              {currentGps
                ? `Lat: ${currentGps.lat.toFixed(4)}, Lng: ${currentGps.lng.toFixed(4)}`
                : "Acquiring GPS fix..."}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">Proximity Geo-fencing Ready</span>
        </div>

        {/* Today's Target Coverage Bar */}
        <div className="mt-4 bg-white/10 p-3 rounded-xl backdrop-blur-xs">
          <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
            <span>Today&apos;s Store Coverage</span>
            <span className="text-emerald-300 font-bold">
              {data.stats.visitedOutlets} / {data.stats.totalOutlets} Outlets (
              {data.stats.coveragePercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 to-teal-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(data.stats.coveragePercent, 5)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Active Check-In Sticky Alert (if currently at a store) */}
      {activeVisit && (
        <div className="bg-amber-500 text-slate-950 p-4 rounded-xl shadow-lg border-2 border-amber-400 animate-in slide-in-from-top duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-black text-amber-400 flex items-center justify-center font-bold text-sm shrink-0">
                <Clock className="h-5 w-5 animate-spin" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded">
                  Live Visit In Progress
                </span>
                <h3 className="text-sm font-black mt-1">
                  At Counter: {activeVisit.retailer?.storeName || "Store Counter"}
                </h3>
                <div className="flex items-center gap-2 text-xs font-mono font-bold mt-0.5">
                  <span>Duration: {formatTimer(visitTimer)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/orders/new?retailerId=${activeVisit.retailerId}&visitId=${activeVisit.id}`}
                className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Book Order</span>
              </Link>

              <button
                onClick={() => {
                  setCheckOutOutletData(activeVisit.retailer);
                  setIsCheckOutModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition shadow-sm shrink-0"
              >
                Check Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beat Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {data.beats.map((beat, idx) => (
          <button
            key={beat.id}
            onClick={() => setSelectedBeatIndex(idx)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 border ${
              selectedBeatIndex === idx
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {beat.name} ({beat.dayOfWeek})
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                selectedBeatIndex === idx ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {beat.retailers.length}
            </span>
          </button>
        ))}
      </div>

      {/* Outlets on This Beat */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
            Route Stops ({outlets.length} Counters)
          </span>
          <span>Order by route sequence</span>
        </div>

        {outlets.map((outlet: any, index: number) => {
          const latestVisit = outlet.visits?.[0];
          const isCurrentlyCheckedIn = latestVisit?.status === "CHECKED_IN";
          const isCompleted =
            latestVisit?.status === "COMPLETED" || latestVisit?.status === "NO_ORDER";

          // Calculate distance from rep
          let distanceStr = "GPS N/A";
          let isNearby = false;
          if (currentGps && outlet.lat && outlet.lng) {
            const meters = getDistanceInMeters(
              currentGps.lat,
              currentGps.lng,
              outlet.lat,
              outlet.lng
            );
            if (meters < 1000) {
              distanceStr = `${meters}m away`;
              isNearby = meters < 250;
            } else {
              distanceStr = `${(meters / 1000).toFixed(1)} km away`;
            }
          }

          return (
            <div
              key={outlet.id}
              className={`bg-white rounded-xl p-4 border transition shadow-xs ${
                isCurrentlyCheckedIn
                  ? "border-amber-400 ring-2 ring-amber-400/20"
                  : isCompleted
                  ? "border-emerald-200 bg-emerald-50/20"
                  : "border-slate-200/80 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isCompleted
                        ? "bg-emerald-100 text-emerald-800"
                        : isCurrentlyCheckedIn
                        ? "bg-amber-100 text-amber-800 animate-pulse"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {outlet.storeName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {outlet.ownerName} • {outlet.phone}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{outlet.address}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0 text-right">
                  {isCurrentlyCheckedIn ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                      <Clock className="h-3 w-3 animate-spin" /> In Progress
                    </span>
                  ) : isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Visited
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                  )}

                  <div className="text-[10px] font-mono font-medium text-slate-500 mt-1">
                    {distanceStr}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {/* Click-to-Call */}
                <a
                  href={`tel:${outlet.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  <Phone className="h-3.5 w-3.5 text-slate-500" />
                  <span>Call Store</span>
                </a>

                {/* Check In / Action button */}
                <div className="flex items-center gap-1.5">
                  {isCurrentlyCheckedIn ? (
                    <>
                      <Link
                        href={`/orders/new?retailerId=${outlet.id}&visitId=${activeVisit?.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Order
                      </Link>
                      <button
                        onClick={() => {
                          setCheckOutOutletData(outlet);
                          setIsCheckOutModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-xs"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Check Out
                      </button>
                    </>
                  ) : isCompleted ? (
                    <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <span>Recorded at {new Date(latestVisit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ) : (
                    <button
                      disabled={!!activeVisit || isSubmitting}
                      onClick={() => handleCheckIn(outlet)}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition shadow-sm ${
                        activeVisit
                          ? "bg-slate-300 cursor-not-allowed text-slate-500"
                          : "bg-indigo-600 hover:bg-indigo-700 active:scale-98"
                      }`}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      GPS Check-In
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Check Out / Visit Outcome Modal */}
      {isCheckOutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Store className="h-5 w-5 text-indigo-600" />
                Finish Visit at {checkOutOutletData?.storeName}
              </h2>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs text-slate-500">
                Log the outcome of your visit. If the retailer did not place an order, select the reason below.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Visit Outcome
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCompleteVisit("COMPLETED")}
                    disabled={isSubmitting}
                    className="p-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-800 font-bold text-xs flex flex-col items-center justify-center gap-1 hover:bg-emerald-100 transition"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Order Booked</span>
                    <span className="text-[10px] text-emerald-600 font-normal">
                      Productive Call
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCompleteVisit("NO_ORDER")}
                    disabled={isSubmitting}
                    className="p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 hover:bg-slate-100 transition"
                  >
                    <XCircle className="h-5 w-5 text-slate-500" />
                    <span>No Order Taken</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Specify Reason
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for No Order (if applicable)
                </label>
                <select
                  value={noOrderReason}
                  onChange={(e) => setNoOrderReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                >
                  <option value="SUFFICIENT_STOCK">Sufficient Inventory in Store</option>
                  <option value="SHOP_CLOSED">Counter / Shop was Closed</option>
                  <option value="OWNER_NOT_AVAILABLE">Owner / Decision Maker Absent</option>
                  <option value="PAYMENT_PENDING">Outstanding Payment Dispute</option>
                  <option value="COMPETITOR_SCHEME">Competitor Offering Better Scheme</option>
                  <option value="PRICE_DISPUTE">Price / Margin Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Visit Notes & Feedback
                </label>
                <textarea
                  rows={2}
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  placeholder="e.g. Requested sample pack for new energy drink, follow up on Friday..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCheckOutModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
