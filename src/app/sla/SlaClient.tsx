"use client";

import { useState, useTransition, useMemo } from "react";
import {
  createSlaPolicy,
  updateSlaPolicy,
  deleteSlaPolicy,
  markSlaResponded,
  markSlaResolved,
  runSlaEscalationCheck,
} from "@/actions/sla";
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Clock,
  Play,
  Check,
  X,
  Edit,
  Trash2,
  AlertTriangle,
  Flame,
  Calendar,
  Building2,
  RefreshCw,
  Eye,
  Activity,
  Layers,
} from "lucide-react";
import DynamicFormRenderer, { FieldDefinitionDTO } from "@/components/custom-fields/DynamicFormRenderer";
import Link from "next/link";

interface SlaClientProps {
  initialPolicies: any[];
  initialExecutions: any[];
  fieldDefinitions?: FieldDefinitionDTO[];
}

export default function SlaClient({
  initialPolicies,
  initialExecutions,
  fieldDefinitions = [],
}: SlaClientProps) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [executions, setExecutions] = useState(initialExecutions);
  const [activeTab, setActiveTab] = useState<"POLICIES" | "MONITOR">("POLICIES");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");

  // Modals & Drawer
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeDetailPolicy, setActiveDetailPolicy] = useState<any | null>(null);

  // Loading & alerts
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("CLIENT");
  const [triggerEvent, setTriggerEvent] = useState("RECORD_CREATED");
  const [priority, setPriority] = useState("MEDIUM");
  const [responseDeadlineMins, setResponseDeadlineMins] = useState("60");
  const [resolutionDeadlineMins, setResolutionDeadlineMins] = useState("1440");
  const [businessCalendar, setBusinessCalendar] = useState("BUSINESS_HOURS");
  const [workHoursStart, setWorkHoursStart] = useState("09:00");
  const [workHoursEnd, setWorkHoursEnd] = useState("18:00");
  const [assignedRole, setAssignedRole] = useState("SALES_REP");
  const [escalationLevel1Mins, setEscalationLevel1Mins] = useState("30");
  const [escalationLevel1Role, setEscalationLevel1Role] = useState("AREA_SALES_MANAGER");
  const [escalationLevel2Mins, setEscalationLevel2Mins] = useState("120");
  const [escalationLevel2Role, setEscalationLevel2Role] = useState("SUPER_ADMIN");
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Filtered Policies
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchModule = selectedModule === "ALL" || p.module === selectedModule;
      const matchPriority = selectedPriority === "ALL" || p.priority === selectedPriority;
      return matchSearch && matchModule && matchPriority;
    });
  }, [policies, searchTerm, selectedModule, selectedPriority]);

  // KPIs
  const totalPolicies = policies.length;
  const activeMonitored = executions.filter((e) => e.status === "IN_PROGRESS").length;
  const breachedCount = executions.filter((e) => e.isResolutionBreached || e.status === "BREACHED").length;
  const escalatedCount = executions.filter((e) => (e.currentEscalationLevel || 0) > 0).length;

  // Open Edit
  function handleOpenEdit(p: any) {
    setEditingId(p.id);
    setIsEditMode(true);
    setName(p.name || "");
    setCode(p.code || "");
    setDescription(p.description || "");
    setModule(p.module || "CLIENT");
    setTriggerEvent(p.triggerEvent || "RECORD_CREATED");
    setPriority(p.priority || "MEDIUM");
    setResponseDeadlineMins(String(p.responseDeadlineMins || 60));
    setResolutionDeadlineMins(String(p.resolutionDeadlineMins || 1440));
    setBusinessCalendar(p.businessCalendar || "BUSINESS_HOURS");
    setWorkHoursStart(p.workHoursStart || "09:00");
    setWorkHoursEnd(p.workHoursEnd || "18:00");
    setAssignedRole(p.assignedRole || "SALES_REP");
    setEscalationLevel1Mins(String(p.escalationLevel1Mins || 30));
    setEscalationLevel1Role(p.escalationLevel1Role || "AREA_SALES_MANAGER");
    setEscalationLevel2Mins(String(p.escalationLevel2Mins || 120));
    setEscalationLevel2Role(p.escalationLevel2Role || "SUPER_ADMIN");
    setCustomFields(p.customFields || {});
    setIsModalOpen(true);
  }

  // Handle Submit Policy
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const payload = {
          name,
          code,
          description,
          module: module as any,
          triggerEvent,
          priority,
          responseDeadlineMins: parseInt(responseDeadlineMins) || 60,
          resolutionDeadlineMins: parseInt(resolutionDeadlineMins) || 1440,
          businessCalendar,
          workHoursStart,
          workHoursEnd,
          assignedRole,
          escalationLevel1Mins: parseInt(escalationLevel1Mins) || 30,
          escalationLevel1Role,
          escalationLevel2Mins: parseInt(escalationLevel2Mins) || 120,
          escalationLevel2Role,
          customFields,
        };

        if (isEditMode && editingId) {
          const res = await updateSlaPolicy({ id: editingId, ...payload });
          if (res.success && res.policy) {
            setPolicies(policies.map((p) => (p.id === editingId ? res.policy : p)));
            if (activeDetailPolicy?.id === editingId) setActiveDetailPolicy(res.policy);
            setMessage({ type: "success", text: `SLA Policy '${res.policy.name}' updated!` });
            setIsModalOpen(false);
          }
        } else {
          const res = await createSlaPolicy(payload);
          if (res.success && res.policy) {
            setPolicies([res.policy, ...policies]);
            setMessage({ type: "success", text: `SLA Policy '${res.policy.name}' activated!` });
            setIsModalOpen(false);
            resetForm();
          }
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to save SLA policy" });
      }
    });
  }

  // Handle Delete
  async function handleDelete(id: string, policyName: string) {
    if (!confirm(`Delete SLA policy '${policyName}'?`)) return;
    startTransition(async () => {
      try {
        const res = await deleteSlaPolicy(id);
        if (res.success) {
          setPolicies(policies.filter((p) => p.id !== id));
          if (activeDetailPolicy?.id === id) setActiveDetailPolicy(null);
          setMessage({ type: "success", text: `SLA policy '${policyName}' deleted.` });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to delete policy" });
      }
    });
  }

  // Live Escalation Check
  async function handleRunEscalationCheck() {
    startTransition(async () => {
      try {
        const res = await runSlaEscalationCheck();
        if (res.success) {
          setMessage({
            type: "success",
            text: `Processed ${res.processed} active SLA clocks. Found ${res.breachCount} breach(es) and escalated ${res.escalationCount} ticket(s)!`,
          });
          window.location.reload();
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Escalation run failed" });
      }
    });
  }

  // Mark Responded
  async function handleMarkResponded(execId: string) {
    startTransition(async () => {
      try {
        const res = await markSlaResponded(execId);
        if (res.success) {
          setExecutions(executions.map((e) => (e.id === execId ? res.execution : e)));
          setMessage({ type: "success", text: "Response recorded. SLA response timer stopped." });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Action failed" });
      }
    });
  }

  // Mark Resolved
  async function handleMarkResolved(execId: string) {
    startTransition(async () => {
      try {
        const res = await markSlaResolved(execId);
        if (res.success) {
          setExecutions(executions.map((e) => (e.id === execId ? res.execution : e)));
          setMessage({ type: "success", text: "Ticket resolved. SLA resolution timer completed." });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Action failed" });
      }
    });
  }

  function resetForm() {
    setEditingId(null);
    setIsEditMode(false);
    setName("");
    setCode(`SLA-${Math.floor(100 + Math.random() * 900)}`);
    setDescription("");
    setModule("CLIENT");
    setTriggerEvent("RECORD_CREATED");
    setPriority("MEDIUM");
    setResponseDeadlineMins("60");
    setResolutionDeadlineMins("1440");
    setBusinessCalendar("BUSINESS_HOURS");
    setWorkHoursStart("09:00");
    setWorkHoursEnd("18:00");
    setAssignedRole("SALES_REP");
    setEscalationLevel1Mins("30");
    setEscalationLevel1Role("AREA_SALES_MANAGER");
    setEscalationLevel2Mins("120");
    setEscalationLevel2Role("SUPER_ADMIN");
    setCustomFields({});
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-600/10 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                SLA Master & Automated Escalation Engine
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Service Level Agreements, multi-tier escalation hierarchy, business calendar schedules, and live breach tracking.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/custom-fields"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition"
          >
            <Sliders className="w-3.5 h-3.5 text-rose-500" />
            Custom Fields
          </Link>

          <button
            onClick={handleRunEscalationCheck}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            Run Escalation Check
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Configure SLA Policy
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between border ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Policies</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{totalPolicies}</p>
          <span className="text-[11px] text-slate-500">Configured SLA rules</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active SLA Clocks</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{activeMonitored}</p>
          <span className="text-[11px] text-blue-600 font-medium">In-flight transactions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">SLA Breaches</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Flame className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{breachedCount}</p>
          <span className="text-[11px] text-rose-600 font-medium">Missed resolution limits</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Escalated Tickets</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{escalatedCount}</p>
          <span className="text-[11px] text-amber-600 font-medium">Level 1 & 2 alerts</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("POLICIES")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
            activeTab === "POLICIES"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          SLA Policies & Escalation Rules ({policies.length})
        </button>
        <button
          onClick={() => setActiveTab("MONITOR")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
            activeTab === "MONITOR"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Live SLA Monitor & Execution Log ({executions.length})
        </button>
      </div>

      {/* TAB 1: POLICIES */}
      {activeTab === "POLICIES" && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search policy name or code..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none"
              />
            </div>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700"
            >
              <option value="ALL">All Modules</option>
              <option value="CLIENT">Client / Lead</option>
              <option value="ORDER">Orders</option>
              <option value="VISIT">Store Visits</option>
            </select>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          {/* Policy Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Policy Code / Name</th>
                    <th className="py-3 px-4">Module & Trigger</th>
                    <th className="py-3 px-4 text-center">Priority</th>
                    <th className="py-3 px-4">Response Time</th>
                    <th className="py-3 px-4">Resolution Limit</th>
                    <th className="py-3 px-4">Escalation Tiers</th>
                    <th className="py-3 px-4">Calendar Schedule</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPolicies.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setActiveDetailPolicy(p)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200 mr-2">
                          {p.code}
                        </span>
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        {p.description && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{p.description}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mr-1.5">
                          {p.module}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">{p.triggerEvent}</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.priority === "URGENT"
                              ? "bg-rose-100 text-rose-800"
                              : p.priority === "HIGH"
                              ? "bg-amber-100 text-amber-800"
                              : p.priority === "MEDIUM"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {p.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        {p.responseDeadlineMins >= 60
                          ? `${(p.responseDeadlineMins / 60).toFixed(1)} hrs`
                          : `${p.responseDeadlineMins} mins`}
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-rose-600">
                        {p.resolutionDeadlineMins >= 60
                          ? `${(p.resolutionDeadlineMins / 60).toFixed(1)} hrs`
                          : `${p.resolutionDeadlineMins} mins`}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <div className="text-[10px]">
                          L1: {p.escalationLevel1Mins}m &rarr; {p.escalationLevel1Role}
                        </div>
                        <div className="text-[10px]">
                          L2: {p.escalationLevel2Mins}m &rarr; {p.escalationLevel2Role}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        <div>{p.businessCalendar}</div>
                        {p.businessCalendar === "BUSINESS_HOURS" && (
                          <div className="text-[10px] text-slate-400">
                            {p.workHoursStart} - {p.workHoursEnd} (Mon-Fri)
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPolicies.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        No SLA policies configured matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE MONITOR & EXECUTION LOG */}
      {activeTab === "MONITOR" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Entity Reference</th>
                    <th className="py-3 px-4">Applied Policy</th>
                    <th className="py-3 px-4">Started At</th>
                    <th className="py-3 px-4">Response Due</th>
                    <th className="py-3 px-4">Resolution Due</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Escalation Tier</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {executions.map((e) => {
                    const isBreached = e.isResolutionBreached || e.status === "BREACHED";

                    return (
                      <tr key={e.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {e.entityReference || `${e.entityType}-${e.entityId.slice(0, 8)}`}
                          <div className="text-[10px] text-slate-400 font-sans">{e.entityType}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{e.policy?.name}</span>
                          <div className="text-[10px] text-slate-400 font-mono">{e.policy?.code}</div>
                        </td>

                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(e.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>

                        <td className="py-3 px-4">
                          {e.respondedAt ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <Check className="h-3 w-3" /> Responded
                            </span>
                          ) : (
                            <span
                              className={`font-mono ${
                                e.isResponseBreached ? "text-rose-600 font-bold" : "text-slate-700"
                              }`}
                            >
                              {new Date(e.responseDueAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {e.resolvedAt ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <Check className="h-3 w-3" /> Resolved
                            </span>
                          ) : (
                            <span
                              className={`font-mono ${
                                isBreached ? "text-rose-600 font-bold" : "text-slate-700"
                              }`}
                            >
                              {new Date(e.resolutionDueAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              e.status === "RESOLVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isBreached
                                ? "bg-rose-100 text-rose-800 border border-rose-300 font-extrabold"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {isBreached ? "BREACHED" : e.status}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {e.currentEscalationLevel > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              Level {e.currentEscalationLevel} ({e.escalatedTo})
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Normal</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!e.respondedAt && (
                              <button
                                onClick={() => handleMarkResponded(e.id)}
                                disabled={isPending}
                                className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold transition"
                              >
                                Response
                              </button>
                            )}
                            {!e.resolvedAt && (
                              <button
                                onClick={() => handleMarkResolved(e.id)}
                                disabled={isPending}
                                className="px-2 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-[11px] font-semibold transition"
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {executions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        No active transactions currently under SLA tracking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SLA Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                {isEditMode ? `Edit Policy: ${code}` : "Configure SLA Policy & Escalation Rules"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Policy Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. VIP Lead First Touch SLA"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Policy Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. SLA-VIP-LEAD"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target CRM Module *</label>
                  <select
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-semibold"
                  >
                    <option value="CLIENT">Client / Lead Master</option>
                    <option value="ORDER">Secondary Orders</option>
                    <option value="VISIT">GPS Store Visits</option>
                    <option value="PRODUCT">Product Catalog</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trigger Event *</label>
                  <select
                    value={triggerEvent}
                    onChange={(e) => setTriggerEvent(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-mono"
                  >
                    <option value="RECORD_CREATED">RECORD_CREATED</option>
                    <option value="STATUS_CHANGED">STATUS_CHANGED</option>
                    <option value="STAGE_CHANGED">STAGE_CHANGED</option>
                    <option value="ORDER_SUBMITTED">ORDER_SUBMITTED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority Level *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-semibold"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Response Deadline (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={responseDeadlineMins}
                    onChange={(e) => setResponseDeadlineMins(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Resolution Deadline (Minutes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={resolutionDeadlineMins}
                    onChange={(e) => setResolutionDeadlineMins(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Business Calendar</label>
                  <select
                    value={businessCalendar}
                    onChange={(e) => setBusinessCalendar(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="BUSINESS_HOURS">Working Hours (Mon-Fri)</option>
                    <option value="24X7">24x7 Continuous</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Ownership Role</label>
                  <select
                    value={assignedRole}
                    onChange={(e) => setAssignedRole(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white"
                  >
                    <option value="SALES_REP">Sales Representative</option>
                    <option value="AREA_SALES_MANAGER">Area Sales Manager</option>
                    <option value="SUPER_ADMIN">System Administrator</option>
                  </select>
                </div>

                {/* Multi-Tier Escalations */}
                <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Automated Escalation Matrix
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Level 1 Reminder (Mins)</label>
                      <input
                        type="number"
                        value={escalationLevel1Mins}
                        onChange={(e) => setEscalationLevel1Mins(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Level 1 Recipient</label>
                      <input
                        type="text"
                        value={escalationLevel1Role}
                        onChange={(e) => setEscalationLevel1Role(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Level 2 Escalation (Mins)</label>
                      <input
                        type="number"
                        value={escalationLevel2Mins}
                        onChange={(e) => setEscalationLevel2Mins(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Level 2 Recipient</label>
                      <input
                        type="text"
                        value={escalationLevel2Role}
                        onChange={(e) => setEscalationLevel2Role(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic custom fields */}
              {fieldDefinitions.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Dynamic Module Attributes
                  </h3>
                  <DynamicFormRenderer
                    fields={fieldDefinitions}
                    values={customFields}
                    onChange={(n, v) => setCustomFields((prev) => ({ ...prev, [n]: v }))}
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isPending ? "Saving..." : isEditMode ? "Update Policy" : "Activate Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
