"use client";

import { useState } from "react";
import {
  Clock,
  Play,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Target,
  Tag,
  Users,
  Zap,
  ArrowRight,
  ShieldCheck,
  Ban,
  Eye,
} from "lucide-react";
import {
  fetchScheduledChanges,
  addScheduledChange,
  cancelSchedule,
  executePendingScheduledChanges,
} from "@/actions/schedule";

interface ScheduleClientProps {
  initialChanges: any[];
  initialMetrics: any;
  schedulableEntities: {
    products: any[];
    targets: any[];
    schemes: any[];
    employees: any[];
    rules: any[];
  };
}

export default function ScheduleClient({
  initialChanges,
  initialMetrics,
  schedulableEntities,
}: ScheduleClientProps) {
  const [changes, setChanges] = useState<any[]>(initialChanges);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionReport, setExecutionReport] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChangeDetails, setSelectedChangeDetails] = useState<any | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [entityType, setEntityType] = useState<string>("PRODUCT_PRICE");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [scheduledFor, setScheduledFor] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  // Payload specific states
  const [priceMrp, setPriceMrp] = useState<string>("");
  const [priceBase, setPriceBase] = useState<string>("");
  const [priceReason, setPriceReason] = useState<string>("");
  const [targetVal, setTargetVal] = useState<string>("");
  const [targetQty, setTargetQty] = useState<string>("");
  const [schemeStatus, setSchemeStatus] = useState<string>("ACTIVE");
  const [employeeManagerId, setEmployeeManagerId] = useState<string>("");
  const [employeeTerritory, setEmployeeTerritory] = useState<string>("");
  const [ruleStatus, setRuleStatus] = useState<string>("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered Changes
  const filteredChanges = changes.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (entityFilter !== "ALL" && c.entityType !== entityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title?.toLowerCase().includes(q);
      const matchEntity = c.entityName?.toLowerCase().includes(q);
      const matchType = c.entityType?.toLowerCase().includes(q);
      return matchTitle || matchEntity || matchType;
    }
    return true;
  });

  // Handle Manual Pending Execution
  const handleRunPendingNow = async () => {
    setIsExecuting(true);
    setExecutionReport(null);
    try {
      const res = await executePendingScheduledChanges();
      if (res.success && res.result) {
        setExecutionReport(res.result);
        // Refresh list
        const refreshed = await fetchScheduledChanges(statusFilter);
        if (refreshed.success) setChanges(refreshed.data);
      } else {
        alert(res.error || "Failed to execute pending changes");
      }
    } catch (e: any) {
      alert("Execution error: " + e.message);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle Cancel
  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled change?")) return;
    try {
      const res = await cancelSchedule(id);
      if (res.success) {
        setChanges((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: "CANCELLED" } : c))
        );
      } else {
        alert(res.error || "Failed to cancel change");
      }
    } catch (e: any) {
      alert("Error cancelling change: " + e.message);
    }
  };

  // Handle Create Schedule Form Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Please provide a title for this scheduled job.");
      return;
    }
    if (!selectedEntityId) {
      alert("Please select a target entity.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find entity name
      let entityName = "";
      let payloadJson: Record<string, any> = {};

      if (entityType === "PRODUCT_PRICE") {
        const prod = schedulableEntities.products.find((p) => p.id === selectedEntityId);
        entityName = prod ? `${prod.name} (${prod.sku})` : "Product";
        payloadJson = {
          mrp: parseFloat(priceMrp) || (prod ? prod.mrp : 0),
          basePrice: parseFloat(priceBase) || (prod ? prod.basePrice : 0),
          reason: priceReason || title,
        };
      } else if (entityType === "TARGET_REVISION") {
        const tgt = schedulableEntities.targets.find((t) => t.id === selectedEntityId);
        entityName = tgt ? `${tgt.title} (${tgt.targetCode})` : "Target";
        payloadJson = {
          targetValue: parseFloat(targetVal) || (tgt ? tgt.targetValue : 0),
          targetQuantity: parseFloat(targetQty) || 0,
          notes: title,
        };
      } else if (entityType === "SCHEME_STATUS") {
        const sch = schedulableEntities.schemes.find((s) => s.id === selectedEntityId);
        entityName = sch ? `${sch.title} (${sch.code})` : "Scheme";
        payloadJson = {
          status: schemeStatus,
          isActive: schemeStatus === "ACTIVE",
        };
      } else if (entityType === "EMPLOYEE_TRANSFER") {
        const emp = schedulableEntities.employees.find((m) => m.id === selectedEntityId);
        entityName = emp ? `${emp.name} (${emp.empCode})` : "Employee";
        payloadJson = {
          managerId: employeeManagerId || null,
          territoryName: employeeTerritory || undefined,
        };
      } else if (entityType === "AUTOMATION_TOGGLE") {
        const r = schedulableEntities.rules.find((rl) => rl.id === selectedEntityId);
        entityName = r ? `${r.ruleName} (${r.ruleCode})` : "Automation Rule";
        payloadJson = {
          status: ruleStatus,
          isActive: ruleStatus === "ACTIVE",
        };
      }

      const res = await addScheduledChange({
        title,
        entityType: entityType as any,
        entityId: selectedEntityId,
        entityName,
        changeType: `SCHEDULED_${entityType}`,
        scheduledFor: new Date(scheduledFor).toISOString(),
        payloadJson,
        appliedBy: "Admin",
      });

      if (res.success && res.data) {
        setChanges([res.data, ...changes]);
        setIsModalOpen(false);
        // Reset form
        setTitle("");
        setSelectedEntityId("");
        setPriceMrp("");
        setPriceBase("");
        setTargetVal("");
      } else {
        alert(res.error || "Failed to schedule change");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "PRODUCT_PRICE":
        return <DollarSign className="h-4 w-4 text-emerald-400" />;
      case "TARGET_REVISION":
        return <Target className="h-4 w-4 text-amber-400" />;
      case "SCHEME_STATUS":
        return <Tag className="h-4 w-4 text-indigo-400" />;
      case "EMPLOYEE_TRANSFER":
        return <Users className="h-4 w-4 text-cyan-400" />;
      case "AUTOMATION_TOGGLE":
        return <Zap className="h-4 w-4 text-purple-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Clock className="h-7 w-7 text-indigo-400" />
            Scheduling Engine & Automated Background Jobs
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure future-dated price adjustments, target revisions, promotional launches, and automated system transitions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunPendingNow}
            disabled={isExecuting}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-medium text-sm transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
          >
            {isExecuting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-white" />
            )}
            Run Pending Changes Now
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition shadow-lg shadow-indigo-900/30"
          >
            <Plus className="h-4 w-4" />
            Schedule Future Change
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{metrics?.totalPending || 0}</div>
            <div className="text-xs text-slate-400 font-medium">Pending Scheduled Jobs</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-400">{metrics?.totalApplied || 0}</div>
            <div className="text-xs text-slate-400 font-medium">Applied Successfully</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-lg">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-400">{metrics?.totalFailed || 0}</div>
            <div className="text-xs text-slate-400 font-medium">Execution Failures</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-semibold text-white truncate">
              {metrics?.nextJobTime
                ? new Date(metrics.nextJobTime).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "No pending jobs"}
            </div>
            <div className="text-xs text-slate-400 font-medium truncate">
              {metrics?.nextJobTitle || "Next Scheduled Job"}
            </div>
          </div>
        </div>
      </div>

      {/* Execution Results Alert Banner */}
      {executionReport && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-emerald-400 text-sm">
              <CheckCircle2 className="h-5 w-5" />
              Automated Run Completed: {executionReport.appliedCount} applied, {executionReport.failedCount} failed
            </div>
            <button
              onClick={() => setExecutionReport(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
          {executionReport.results && executionReport.results.length > 0 && (
            <div className="text-xs space-y-1 pt-1 border-t border-slate-800/80">
              {executionReport.results.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-1 text-slate-300">
                  <span className="font-mono">{r.title} ({r.entityType})</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status === "APPLIED" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {r.status} {r.error && `- ${r.error}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {["ALL", "PENDING", "APPLIED", "FAILED", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/40"
                  : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Entity Types</option>
            <option value="PRODUCT_PRICE">Product Prices</option>
            <option value="TARGET_REVISION">Target Quotas</option>
            <option value="SCHEME_STATUS">Schemes</option>
            <option value="EMPLOYEE_TRANSFER">Employee Reassignments</option>
            <option value="AUTOMATION_TOGGLE">Automation Rules</option>
          </select>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-2 outline-none focus:border-indigo-500 placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Scheduled Changes Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Entity & Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Scheduled Execution</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredChanges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No scheduled changes match your selected filters.
                  </td>
                </tr>
              ) : (
                filteredChanges.map((change) => {
                  const isPending = change.status === "PENDING";
                  const isApplied = change.status === "APPLIED";
                  const isFailed = change.status === "FAILED";
                  const isCancelled = change.status === "CANCELLED";

                  return (
                    <tr key={change.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                            {getEntityIcon(change.entityType)}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm">{change.title}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Created by {change.appliedBy || "System"} on{" "}
                              {new Date(change.createdAt).toLocaleDateString("en-IN")}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {change.entityType}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          {new Date(change.scheduledFor).toLocaleString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        {isApplied && change.appliedAt && (
                          <div className="text-[10px] text-emerald-400 mt-0.5">
                            Executed {new Date(change.appliedAt).toLocaleTimeString("en-IN")}
                          </div>
                        )}
                        {isFailed && change.errorMessage && (
                          <div className="text-[10px] text-rose-400 mt-0.5 truncate max-w-xs">
                            Error: {change.errorMessage}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">
                          {change.entityName || change.entityId}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            isPending
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : isApplied
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : isFailed
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPending
                                ? "bg-amber-400 animate-pulse"
                                : isApplied
                                ? "bg-emerald-400"
                                : isFailed
                                ? "bg-rose-400"
                                : "bg-slate-400"
                            }`}
                          />
                          {change.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedChangeDetails(change)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition"
                            title="View Payload"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {isPending && (
                            <button
                              onClick={() => handleCancel(change.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                              title="Cancel Scheduled Change"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Schedule Future Change */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-400" />
                Schedule Future Change
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Price Revision for Top Beverages"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Entity Type *</label>
                  <select
                    value={entityType}
                    onChange={(e) => {
                      setEntityType(e.target.value);
                      setSelectedEntityId("");
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="PRODUCT_PRICE">Product Price Revision</option>
                    <option value="TARGET_REVISION">Target Quota Revision</option>
                    <option value="SCHEME_STATUS">Scheme Status Toggle</option>
                    <option value="EMPLOYEE_TRANSFER">Employee Reassignment</option>
                    <option value="AUTOMATION_TOGGLE">Automation Rule Toggle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Execution Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Target Record *</label>
                <select
                  required
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Target Entity --</option>
                  {entityType === "PRODUCT_PRICE" &&
                    schedulableEntities.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.sku}] - Current MRP: ₹{p.mrp}
                      </option>
                    ))}
                  {entityType === "TARGET_REVISION" &&
                    schedulableEntities.targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} [{t.targetCode}] - Target: ₹{t.targetValue}
                      </option>
                    ))}
                  {entityType === "SCHEME_STATUS" &&
                    schedulableEntities.schemes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} [{s.code}] - Status: {s.status}
                      </option>
                    ))}
                  {entityType === "EMPLOYEE_TRANSFER" &&
                    schedulableEntities.employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} [{emp.empCode}] - {emp.designation} ({emp.territoryName || "No territory"})
                      </option>
                    ))}
                  {entityType === "AUTOMATION_TOGGLE" &&
                    schedulableEntities.rules.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.ruleName} [{r.ruleCode}] - Status: {r.status}
                      </option>
                    ))}
                </select>
              </div>

              {/* Dynamic Payload Form depending on entityType */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-3">
                <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                  Change Parameters
                </div>

                {entityType === "PRODUCT_PRICE" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400">New MRP (₹) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="e.g. 150.00"
                          value={priceMrp}
                          onChange={(e) => setPriceMrp(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400">New Base Wholesale Price (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 110.00"
                          value={priceBase}
                          onChange={(e) => setPriceBase(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-slate-400">Price Change Reason</label>
                      <input
                        type="text"
                        placeholder="e.g. Annual Raw Material Inflation"
                        value={priceReason}
                        onChange={(e) => setPriceReason(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                )}

                {entityType === "TARGET_REVISION" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400">Revised Target Value (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="e.g. 500000"
                        value={targetVal}
                        onChange={(e) => setTargetVal(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400">Revised Target Quantity</label>
                      <input
                        type="number"
                        placeholder="e.g. 2500"
                        value={targetQty}
                        onChange={(e) => setTargetQty(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                )}

                {entityType === "SCHEME_STATUS" && (
                  <div>
                    <label className="text-slate-400">Target Scheme Status *</label>
                    <select
                      value={schemeStatus}
                      onChange={(e) => setSchemeStatus(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option value="ACTIVE">ACTIVE (Activate Scheme)</option>
                      <option value="INACTIVE">INACTIVE (Deactivate / Expire Scheme)</option>
                    </select>
                  </div>
                )}

                {entityType === "EMPLOYEE_TRANSFER" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-400">New Reporting Manager</label>
                      <select
                        value={employeeManagerId}
                        onChange={(e) => setEmployeeManagerId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                      >
                        <option value="">-- No Manager / Top of Hierarchy --</option>
                        {schedulableEntities.employees.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.designation})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400">New Territory Name</label>
                      <input
                        type="text"
                        placeholder="e.g. North Bengaluru Territory"
                        value={employeeTerritory}
                        onChange={(e) => setEmployeeTerritory(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                      />
                    </div>
                  </div>
                )}

                {entityType === "AUTOMATION_TOGGLE" && (
                  <div>
                    <label className="text-slate-400">Target Rule Status *</label>
                    <select
                      value={ruleStatus}
                      onChange={(e) => setRuleStatus(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      <option value="ACTIVE">ACTIVE (Enable Automation Rule)</option>
                      <option value="PAUSED">PAUSED (Pause Automation Rule)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition disabled:opacity-50"
                >
                  {isSubmitting ? "Scheduling..." : "Schedule Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Change Details / Payload */}
      {selectedChangeDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-400" />
                Scheduled Change Payload
              </h2>
              <button
                onClick={() => setSelectedChangeDetails(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400">Job Title:</span>
                <p className="font-semibold text-white">{selectedChangeDetails.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400">Entity Type:</span>
                  <p className="font-mono text-indigo-300">{selectedChangeDetails.entityType}</p>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <p className="font-bold text-white">{selectedChangeDetails.status}</p>
                </div>
              </div>
              <div>
                <span className="text-slate-400">Scheduled For:</span>
                <p className="text-slate-200">
                  {new Date(selectedChangeDetails.scheduledFor).toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Payload JSON:</span>
                <pre className="mt-1 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedChangeDetails.payloadJson, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedChangeDetails(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
