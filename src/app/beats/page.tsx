import { getBeats } from "@/actions/masters";
import { MapPin, Calendar, User, Store, Route } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BeatsPage() {
  const beats = await getBeats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Route className="h-5 w-5 text-purple-600" />
          Beats & Route Planning Master
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Pre-defined market routes organized by Day of Week, assigned to Field Officers (FSO) to ensure regular retail coverage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {beats.map((b) => (
          <div
            key={b.id}
            className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200/60">
                  {b.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">{b.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {b.territory.name} ({b.territory.city})
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
                <Calendar className="h-3.5 w-3.5 text-purple-500" />
                {b.dayOfWeek}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-600 font-medium">
                  {b.assignedTo?.name || "Unassigned"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg">
                <Store className="h-3.5 w-3.5" />
                <span>{b._count.retailers} Outlets</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
