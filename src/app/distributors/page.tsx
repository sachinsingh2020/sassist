import { getDistributors } from "@/actions/masters";
import { Truck, MapPin, Phone, Mail, Building2, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DistributorsPage() {
  const distributors = await getDistributors();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Truck className="h-5 w-5 text-amber-600" />
          Distributor & Stockist Network Master
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Registered primary channel partners responsible for warehouse holding, primary order intake, and secondary fulfillment to retailers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {distributors.map((d) => (
          <div
            key={d.id}
            className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200/60">
                  {d.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1.5">{d.name}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {d.territory.name} ({d.territory.zone} Zone)
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Active Stockist
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-100">
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Contact Person</span>
                <span className="font-medium text-slate-800">{d.contactPerson}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Phone Number</span>
                <span className="font-medium text-slate-800 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {d.phone}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase">Warehouse Address</span>
                <span className="text-slate-600 block truncate">{d.address}</span>
              </div>
              {d.gstin && (
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">GSTIN / Tax ID</span>
                  <span className="font-mono text-slate-800 font-semibold">{d.gstin}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
