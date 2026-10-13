import { getAllVisitsHistory } from "@/actions/visits";
import {
  Compass,
  MapPin,
  Clock,
  User,
  Store,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VisitsAuditPage() {
  const visits = await getAllVisitsHistory();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="h-5 w-5 text-indigo-600" />
            Field Attendance & GPS Visit Audit Log
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of Field Sales Officers (FSO) counter visits, GPS geo-tags, visit durations, and reasons for non-ordering.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {visits.length} Total Visits Recorded
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Sales Officer</th>
                <th className="py-3 px-4">Retail Outlet</th>
                <th className="py-3 px-4">Beat / Territory</th>
                <th className="py-3 px-4">Check-In Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">GPS Geo-Tag</th>
                <th className="py-3 px-4 text-center">Status / Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visits.map((v) => {
                const checkInDate = new Date(v.checkIn);
                const checkOutDate = v.checkOut ? new Date(v.checkOut) : null;
                const durationMins = checkOutDate
                  ? Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 60000)
                  : null;

                return (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {v.rep.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{v.rep.phone}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{v.retailer.storeName}</div>
                      <div className="text-[11px] text-slate-500">{v.retailer.ownerName}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        <MapPin className="h-3 w-3 text-indigo-500" />
                        {v.beat.name}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <div>{checkInDate.toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {checkInDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium font-mono">
                      {durationMins !== null ? (
                        <span>{durationMins} mins</span>
                      ) : (
                        <span className="text-amber-600 animate-pulse text-[11px]">In Progress</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {v.lat && v.lng ? (
                        <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {v.lat.toFixed(4)}, {v.lng.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">No GPS</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {v.status === "COMPLETED" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> Productive Call
                        </span>
                      ) : v.status === "NO_ORDER" ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                            <XCircle className="h-3 w-3" /> No Order
                          </span>
                          {v.noOrderReason && (
                            <span className="text-[9px] text-slate-500 mt-0.5 font-medium">
                              {v.noOrderReason.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Clock className="h-3 w-3 animate-spin" /> Checked In
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {visits.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No field visits recorded yet today. Reps can check in from Field Rep Mode.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
