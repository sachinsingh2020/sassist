"use client";

import { useState } from "react";
import {
  createNewLead,
  updateLeadStage,
  convertLeadToEntity,
} from "@/actions/leads";
import {
  Users,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  XCircle,
} from "lucide-react";

interface LeadsPipelineClientProps {
  initialData: {
    leads: any[];
    territories: any[];
    distributors: any[];
    beats: any[];
    stats: {
      totalLeads: number;
      totalPipelineValue: number;
      wonLeads: number;
      conversionRate: number;
    };
  };
}

const STAGES = [
  { key: "NEW", label: "New Leads", color: "border-sky-500 bg-sky-50 text-sky-800" },
  { key: "CONTACTED", label: "Contacted", color: "border-indigo-500 bg-indigo-50 text-indigo-800" },
  { key: "QUALIFIED", label: "Qualified", color: "border-amber-500 bg-amber-50 text-amber-800" },
  { key: "PROPOSAL", label: "Proposal Sent", color: "border-purple-500 bg-purple-50 text-purple-800" },
  { key: "ONBOARDED", label: "Onboarded (Won)", color: "border-emerald-500 bg-emerald-50 text-emerald-800" },
  { key: "LOST", label: "Lost", color: "border-rose-400 bg-rose-50 text-rose-800" },
];

export default function LeadsPipelineClient({ initialData }: LeadsPipelineClientProps) {
  const [data, setData] = useState(initialData);
  const [leads, setLeads] = useState(initialData.leads);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedConvertLead, setSelectedConvertLead] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // New Lead Form states
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [leadType, setLeadType] = useState("DISTRIBUTOR");
  const [expectedVal, setExpectedVal] = useState("100000");
  const [notes, setNotes] = useState("");

  // Convert Form states
  const [selectedTerritoryId, setSelectedTerritoryId] = useState(data.territories[0]?.id || "");
  const [selectedBeatId, setSelectedBeatId] = useState(data.beats[0]?.id || "");
  const [selectedDistributorId, setSelectedDistributorId] = useState(data.distributors[0]?.id || "");

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await createNewLead({
        businessName,
        contactName,
        phone,
        email,
        address,
        leadType,
        expectedVal: parseFloat(expectedVal) || 0,
        notes,
      });

      if (res.success && res.lead) {
        setLeads([res.lead, ...leads]);
        setMessage("Prospect added to CRM pipeline!");
        setIsModalOpen(false);
        // Reset form
        setBusinessName("");
        setContactName("");
        setPhone("");
        setEmail("");
        setAddress("");
        setNotes("");
      }
    } catch (err: any) {
      alert("Error creating lead: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStageChange(leadId: string, newStage: any) {
    setIsSubmitting(true);
    try {
      const res = await updateLeadStage(leadId, newStage);
      if (res.success && res.lead) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l)));
      }
    } catch (err: any) {
      alert("Error updating stage: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConvertLead(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConvertLead) return;
    setIsSubmitting(true);

    try {
      const res = await convertLeadToEntity({
        leadId: selectedConvertLead.id,
        territoryId: selectedTerritoryId,
        beatId: selectedBeatId,
        distributorId: selectedDistributorId,
      });

      if (res.success) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === selectedConvertLead.id ? { ...l, stage: "ONBOARDED" } : l
          )
        );
        setMessage(`Successfully converted ${selectedConvertLead.businessName} to active master!`);
        setIsConvertModalOpen(false);
      }
    } catch (err: any) {
      alert("Error converting lead: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-600" />
            Channel CRM & Lead Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Recruit, qualify, and onboard prospective stockists, modern trade distributors, and retail counters.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-xs font-semibold shadow-sm transition shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Prospect
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}

      {/* Pipeline Analytics Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Total Pipeline Leads
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {leads.length}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Estimated Pipeline Value
          </span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            ₹{data.stats.totalPipelineValue.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Successfully Onboarded
          </span>
          <span className="text-2xl font-black text-indigo-600 mt-1 block">
            {leads.filter((l) => l.stage === "ONBOARDED").length} Won
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Conversion Rate
          </span>
          <span className="text-2xl font-black text-cyan-600 mt-1 block">
            {data.stats.conversionRate}%
          </span>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage.key);
          const stageValue = stageLeads.reduce((acc, l) => acc + (l.expectedVal || 0), 0);

          return (
            <div
              key={stage.key}
              className="bg-slate-100/70 rounded-2xl p-3 border border-slate-200/80 flex flex-col min-w-[220px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-xs font-black text-slate-800">{stage.label}</h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ₹{stageValue.toLocaleString()}
                  </span>
                </div>
                <span className="h-5 w-5 rounded-full bg-white text-slate-700 text-[10px] font-bold flex items-center justify-center border border-slate-200 shadow-xs">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards in this Stage */}
              <div className="space-y-2.5 flex-1">
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {lead.leadType}
                      </span>
                      <span className="text-[10px] font-black text-emerald-600">
                        ₹{lead.expectedVal ? lead.expectedVal.toLocaleString() : "0"}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {lead.businessName}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{lead.contactName}</p>
                    </div>

                    {lead.notes && (
                      <p className="text-[10px] text-slate-600 italic bg-slate-50 p-1.5 rounded-md border border-slate-100 line-clamp-2">
                        &ldquo;{lead.notes}&rdquo;
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        <span>Call</span>
                      </a>

                      {/* Convert to Entity Button if Qualified */}
                      {(lead.stage === "QUALIFIED" || lead.stage === "PROPOSAL") && (
                        <button
                          onClick={() => {
                            setSelectedConvertLead(lead);
                            setIsConvertModalOpen(true);
                          }}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition flex items-center gap-0.5"
                        >
                          <Zap className="h-2.5 w-2.5" />
                          <span>Convert</span>
                        </button>
                      )}
                    </div>

                    {/* Stage Transition Control */}
                    <div className="pt-1 flex items-center justify-between">
                      <select
                        value={lead.stage}
                        disabled={isSubmitting}
                        onChange={(e) => handleStageChange(lead.id, e.target.value)}
                        className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none"
                      >
                        {STAGES.map((s) => (
                          <option key={s.key} value={s.key}>
                            Move to: {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {stageLeads.length === 0 && (
                  <div className="py-6 text-center text-slate-400 text-[11px] italic">
                    No leads in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-600" />
              Capture Prospective Channel Lead
            </h2>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Store Name</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Consumer Distributors"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Rahul Mehta"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98000 00000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prospect Type</label>
                  <select
                    value={leadType}
                    onChange={(e) => setLeadType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    <option value="DISTRIBUTOR">Distributor / Stockist</option>
                    <option value="RETAILER">Retail Outlet / Counter</option>
                    <option value="DEALER">Sub-Dealer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expected Annual Value (₹)</label>
                  <input
                    type="number"
                    value={expectedVal}
                    onChange={(e) => setExpectedVal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Market Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Market name, City"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Discussion Notes / Territory</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Has 2 warehouse vans, strong reach in West Delhi Kirana network"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
                  className="px-4 py-2 font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Add to Pipeline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Lead to Master Modal */}
      {isConvertModalOpen && selectedConvertLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                One-Click Onboarding
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Convert &ldquo;{selectedConvertLead.businessName}&rdquo; into Active{" "}
                {selectedConvertLead.leadType}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                This will automatically add this partner into your live database without re-typing.
              </p>
            </div>

            <form onSubmit={handleConvertLead} className="space-y-3 text-xs">
              {selectedConvertLead.leadType === "DISTRIBUTOR" ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assign Territory / Zone
                  </label>
                  <select
                    value={selectedTerritoryId}
                    onChange={(e) => setSelectedTerritoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {data.territories.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.city}, {t.zone} Zone)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Assign Route Beat
                    </label>
                    <select
                      value={selectedBeatId}
                      onChange={(e) => setSelectedBeatId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {data.beats.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.dayOfWeek})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Mapping Stockist / Distributor
                    </label>
                    <select
                      value={selectedDistributorId}
                      onChange={(e) => setSelectedDistributorId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {data.distributors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
                >
                  {isSubmitting ? "Converting..." : "Onboard Partner Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
