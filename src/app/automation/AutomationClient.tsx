"use client";

import { useState, useTransition, useMemo } from "react";
import {
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  toggleAutomationRuleStatus,
  retryAutomationExecution,
} from "@/actions/automation";
import {
  Zap,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Play,
  RotateCw,
  Power,
  Layers,
  ArrowRight,
  UserCheck,
  Edit,
  Trash2,
  X,
  FileCode,
  ShieldCheck,
  Clock,
  Sparkles,
  RefreshCw,
  Activity,
  History,
} from "lucide-react";
import DynamicFormRenderer, { FieldDefinitionDTO } from "@/components/custom-fields/DynamicFormRenderer";
import Link from "next/link";

interface AutomationClientProps {
  initialRules: any[];
  initialLogs: any[];
  fieldDefinitions?: FieldDefinitionDTO[];
}

export default function AutomationClient({
  initialRules,
  initialLogs,
  fieldDefinitions = [],
}: AutomationClientProps) {
  const [rules, setRules] = useState(initialRules);
  const [logs, setLogs] = useState(initialLogs);
  const [activeTab, setActiveTab] = useState<"RULES" | "LOGS">("RULES");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeDetailRule, setActiveDetailRule] = useState<any | null>(null);

  // Loading & alerts
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleCode, setRuleCode] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("CLIENT");
  const [triggerType, setTriggerType] = useState("RECORD_CREATED");
  const [triggerField, setTriggerField] = useState("");
  const [conditions, setConditions] = useState<Array<{ field: string; operator: string; value: string }>>([
    { field: "clientType", operator: "EQUALS", value: "LEAD" },
  ]);
  const [actionType, setActionType] = useState("CLIENT_TYPE_CONVERSION");
  const [toType, setToType] = useState("CUSTOMER");
  const [toStage, setToStage] = useState("WON");
  const [conversionReason, setConversionReason] = useState("Commercial order qualification");
  const [updateFieldName, setUpdateFieldName] = useState("status");
  const [updateFieldValue, setUpdateFieldValue] = useState("ACTIVE");
  const [executionTiming, setExecutionTiming] = useState("IMMEDIATE");
  const [recurrence, setRecurrence] = useState("ONCE");
  const [failurePolicy, setFailurePolicy] = useState("CONTINUE");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchSearch =
        r.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.ruleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchModule = selectedModule === "ALL" || r.module === selectedModule;
      const matchAction = selectedAction === "ALL" || r.actionType === selectedAction;
      const matchStatus = selectedStatus === "ALL" || r.status === selectedStatus;

      return matchSearch && matchModule && matchAction && matchStatus;
    });
  }, [rules, searchTerm, selectedModule, selectedAction, selectedStatus]);

  // KPIs
  const activeRulesCount = rules.filter((r) => r.isActive && r.status === "ACTIVE").length;
  const totalExecutions = rules.reduce((acc, r) => acc + (r.executionCount || 0), 0);
  const successfulLogsCount = logs.filter((l) => l.executionStatus === "SUCCESS").length;
  const successRate =
    logs.length > 0 ? Math.round((successfulLogsCount / logs.length) * 1000) / 10 : 100;
  const conversionLogsCount = logs.filter((l) =>
    l.actionTaken?.toLowerCase().includes("converted client")
  ).length;

  // Open Edit
  function handleOpenEdit(r: any) {
    setEditingId(r.id);
    setIsEditMode(true);
    setRuleName(r.ruleName || "");
    setRuleCode(r.ruleCode || "");
    setDescription(r.description || "");
    setModule(r.module || "CLIENT");
    setTriggerType(r.triggerType || "RECORD_CREATED");
    setTriggerField(r.triggerField || "");

    try {
      setConditions(r.conditionsJson ? JSON.parse(r.conditionsJson) : []);
    } catch {
      setConditions([]);
    }

    setActionType(r.actionType || "CLIENT_TYPE_CONVERSION");
    try {
      const cfg = JSON.parse(r.actionConfigJson || "{}");
      setToType(cfg.toType || "CUSTOMER");
      setToStage(cfg.stage || "WON");
      setConversionReason(cfg.reason || "");
      if (cfg.fieldUpdates) {
        const firstKey = Object.keys(cfg.fieldUpdates)[0] || "status";
        setUpdateFieldName(firstKey);
        setUpdateFieldValue(cfg.fieldUpdates[firstKey] || "ACTIVE");
      }
    } catch {
      // Default
    }

    setExecutionTiming(r.executionTiming || "IMMEDIATE");
    setRecurrence(r.recurrence || "ONCE");
    setFailurePolicy(r.failurePolicy || "CONTINUE");
    setRequiresApproval(r.requiresApproval || false);
    setCustomFields(r.customFields || {});
    setIsModalOpen(true);
  }

  // Handle Submit Rule
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        let actionConfig: any = {};
        if (actionType === "CLIENT_TYPE_CONVERSION") {
          actionConfig = {
            toType,
            stage: toStage,
            reason: conversionReason || "Automated conversion rule",
          };
        } else if (actionType === "FIELD_UPDATE") {
          actionConfig = {
            fieldUpdates: { [updateFieldName]: updateFieldValue },
          };
        }

        const payload = {
          ruleName,
          ruleCode,
          description,
          module: module as any,
          triggerType,
          triggerField: triggerField || undefined,
          conditionsJson: JSON.stringify(conditions),
          actionType,
          actionConfigJson: JSON.stringify(actionConfig),
          executionTiming,
          recurrence,
          failurePolicy,
          requiresApproval,
          customFields,
        };

        if (isEditMode && editingId) {
          const res = await updateAutomationRule({ id: editingId, ...payload });
          if (res.success && res.rule) {
            setRules(rules.map((r) => (r.id === editingId ? res.rule : r)));
            if (activeDetailRule?.id === editingId) setActiveDetailRule(res.rule);
            setMessage({ type: "success", text: `Automation rule '${res.rule.ruleName}' updated!` });
            setIsModalOpen(false);
          }
        } else {
          const res = await createAutomationRule(payload);
          if (res.success && res.rule) {
            setRules([res.rule, ...rules]);
            setMessage({ type: "success", text: `Automation rule '${res.rule.ruleName}' activated!` });
            setIsModalOpen(false);
            resetForm();
          }
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to save rule" });
      }
    });
  }

  // Toggle Rule Status
  async function handleToggleStatus(id: string, currentActive: boolean) {
    startTransition(async () => {
      try {
        const res = await toggleAutomationRuleStatus(id, !currentActive);
        if (res.success && res.rule) {
          setRules(rules.map((r) => (r.id === id ? res.rule : r)));
          setMessage({
            type: "success",
            text: `Rule is now ${res.rule.isActive ? "ACTIVE" : "PAUSED"}.`,
          });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Toggle failed" });
      }
    });
  }

  // Delete
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete automation rule '${name}'?`)) return;
    startTransition(async () => {
      try {
        const res = await deleteAutomationRule(id);
        if (res.success) {
          setRules(rules.filter((r) => r.id !== id));
          if (activeDetailRule?.id === id) setActiveDetailRule(null);
          setMessage({ type: "success", text: `Rule '${name}' deleted.` });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to delete" });
      }
    });
  }

  // Retry failed log
  async function handleRetryLog(logId: string) {
    startTransition(async () => {
      try {
        const res = await retryAutomationExecution(logId);
        if (res.success) {
          setMessage({ type: "success", text: "Automation re-executed successfully!" });
          window.location.reload();
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Retry failed" });
      }
    });
  }

  function resetForm() {
    setEditingId(null);
    setIsEditMode(false);
    setRuleName("");
    setRuleCode(`RULE-${Math.floor(100 + Math.random() * 900)}`);
    setDescription("");
    setModule("CLIENT");
    setTriggerType("RECORD_CREATED");
    setTriggerField("");
    setConditions([{ field: "clientType", operator: "EQUALS", value: "LEAD" }]);
    setActionType("CLIENT_TYPE_CONVERSION");
    setToType("CUSTOMER");
    setToStage("WON");
    setConversionReason("Commercial order qualification");
    setUpdateFieldName("status");
    setUpdateFieldValue("ACTIVE");
    setExecutionTiming("IMMEDIATE");
    setRecurrence("ONCE");
    setFailurePolicy("CONTINUE");
    setRequiresApproval(false);
    setCustomFields({});
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Automation Rules Master & Conversion Engine
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated business rules, client-type promotions (Lead &rarr; Customer), dynamic field mutators, and workflow triggers.
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
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Create Automation Rule
          </button>
        </div>
      </div>

      {/* Message Alert */}
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
            <span className="text-xs font-medium text-slate-500">Active Automations</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Zap className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{activeRulesCount}</p>
          <span className="text-[11px] text-amber-600 font-medium">Live business triggers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Executions</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Activity className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{totalExecutions}</p>
          <span className="text-[11px] text-indigo-600 font-medium">Automatic system mutations</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Success Reliability</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{successRate}%</p>
          <span className="text-[11px] text-emerald-600 font-medium">Error-free automation rate</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Auto-Conversions</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <UserCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{conversionLogsCount}</p>
          <span className="text-[11px] text-blue-600 font-medium">Leads converted to Customers</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("RULES")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
            activeTab === "RULES"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Business Automation Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab("LOGS")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
            activeTab === "LOGS"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Live Automation Execution Audit Logs ({logs.length})
        </button>
      </div>

      {/* TAB 1: RULES */}
      {activeTab === "RULES" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search rule title or code..."
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
              <option value="PRODUCT">Product Catalog</option>
              <option value="VISIT">Store Visits</option>
            </select>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700"
            >
              <option value="ALL">All Actions</option>
              <option value="CLIENT_TYPE_CONVERSION">Client Conversion</option>
              <option value="FIELD_UPDATE">Field Mutator</option>
              <option value="OWNERSHIP_CHANGE">Ownership Reassignment</option>
              <option value="SLA_TRIGGER">SLA Clock Trigger</option>
            </select>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRules.map((r) => {
              let conditionsList: any[] = [];
              try {
                conditionsList = JSON.parse(r.conditionsJson || "[]");
              } catch {}

              return (
                <div
                  key={r.id}
                  onClick={() => setActiveDetailRule(r)}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer space-y-3.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                          {r.ruleCode}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {r.module}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-2">{r.ruleName}</h3>
                      {r.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleStatus(r.id, r.isActive)}
                        className={`p-1 rounded transition ${
                          r.isActive
                            ? "text-emerald-600 hover:bg-emerald-50"
                            : "text-slate-400 hover:bg-slate-100"
                        }`}
                        title={r.isActive ? "Pause Automation" : "Activate Automation"}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id, r.ruleName)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Flow Pills: Trigger -> Condition -> Action */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono text-[11px] font-semibold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                      ON {r.triggerType}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                      IF {conditionsList.length > 0 ? `${conditionsList.length} Condition(s)` : "Always"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                      DO {r.actionType.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Execution footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <Activity className="h-3.5 w-3.5 text-slate-400" />
                      Executed {r.executionCount} time(s)
                    </span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                        r.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {r.isActive ? "ACTIVE" : "PAUSED"}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredRules.length === 0 && (
              <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                No automation rules found matching your filter criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EXECUTION LOGS */}
      {activeTab === "LOGS" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Applied Rule</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Trigger Event</th>
                    <th className="py-3 px-4">Action Taken / Mutation</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Retry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {l.rule?.ruleName || "Automation Rule"}
                        <div className="text-[10px] font-mono text-slate-400">{l.rule?.ruleCode}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-indigo-600">
                          {l.entityReference || l.entityId}
                        </span>
                        <div className="text-[10px] text-slate-400">{l.entityType}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">{l.triggerEvent}</td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">{l.actionTaken}</span>
                        {l.errorMessage && (
                          <div className="text-[10px] text-rose-600 mt-0.5">{l.errorMessage}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            l.executionStatus === "SUCCESS"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-300"
                          }`}
                        >
                          {l.executionStatus}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(l.executedAt).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {l.executionStatus !== "SUCCESS" && (
                          <button
                            onClick={() => handleRetryLog(l.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[11px] font-semibold transition"
                          >
                            <RotateCw className="h-3 w-3" /> Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No automation logs recorded yet. Automations trigger as live records are created or updated.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rule Detail Slide-over Drawer */}
      {activeDetailRule && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {activeDetailRule.ruleCode}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {activeDetailRule.ruleName}
                </h2>
                <p className="text-xs text-slate-500">Module: {activeDetailRule.module}</p>
              </div>
              <button
                onClick={() => setActiveDetailRule(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 flex-1 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Rule Logic Overview
                </span>
                <p className="text-slate-700">{activeDetailRule.description || "No description provided."}</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Trigger Event</span>
                    <span className="font-semibold text-slate-800">{activeDetailRule.triggerType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Action Type</span>
                    <span className="font-semibold text-slate-800">{activeDetailRule.actionType}</span>
                  </div>
                </div>
              </div>

              {/* Conditions */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-600">
                  <FileCode className="h-4 w-4 text-indigo-600" />
                  Execution Conditions
                </h3>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto font-mono text-[11px]">
                  {JSON.stringify(JSON.parse(activeDetailRule.conditionsJson || "[]"), null, 2)}
                </pre>
              </div>

              {/* Action config */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-600">
                  <Zap className="h-4 w-4 text-amber-600" />
                  Action Configuration Payload
                </h3>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto font-mono text-[11px]">
                  {JSON.stringify(JSON.parse(activeDetailRule.actionConfigJson || "{}"), null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => handleOpenEdit(activeDetailRule)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Rule
              </button>
              <button
                onClick={() => handleDelete(activeDetailRule.id, activeDetailRule.ruleName)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 text-rose-600 bg-rose-50 rounded-lg text-xs font-semibold hover:bg-rose-100 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-600" />
                {isEditMode ? `Edit Rule: ${ruleCode}` : "Configure Automation Rule"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Rule Name *</label>
                  <input
                    type="text"
                    required
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g. Auto-Convert Prospect to Customer on First Order"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rule Code *</label>
                  <input
                    type="text"
                    required
                    value={ruleCode}
                    onChange={(e) => setRuleCode(e.target.value)}
                    placeholder="e.g. AUTO-FIRST-ORDER"
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
                    <option value="PRODUCT">Product Master</option>
                    <option value="VISIT">GPS Store Visits</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trigger Event *</label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-mono"
                  >
                    <option value="RECORD_CREATED">RECORD_CREATED</option>
                    <option value="STATUS_CHANGED">STATUS_CHANGED</option>
                    <option value="FIELD_CHANGED">FIELD_CHANGED</option>
                    <option value="SCHEDULED_TIME">SCHEDULED_TIME</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Action Type *</label>
                  <select
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-semibold text-amber-700"
                  >
                    <option value="CLIENT_TYPE_CONVERSION">Client-Type Conversion (e.g. Lead &rarr; Customer)</option>
                    <option value="FIELD_UPDATE">Field Mutator (Update Property)</option>
                    <option value="OWNERSHIP_CHANGE">Reassign Record Owner</option>
                    <option value="SLA_TRIGGER">Trigger SLA Tracking Clock</option>
                  </select>
                </div>

                {/* Condition Builder */}
                <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-800">
                      Rule Evaluation Conditions (All must match)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setConditions([...conditions, { field: "status", operator: "EQUALS", value: "ACTIVE" }])
                      }
                      className="text-amber-700 font-semibold hover:underline"
                    >
                      + Add Condition
                    </button>
                  </div>

                  {conditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Field e.g. totalAmount"
                        value={cond.field}
                        onChange={(e) => {
                          const updated = [...conditions];
                          updated[idx].field = e.target.value;
                          setConditions(updated);
                        }}
                        className="w-1/3 px-2 py-1 bg-white border border-slate-200 rounded font-mono"
                      />
                      <select
                        value={cond.operator}
                        onChange={(e) => {
                          const updated = [...conditions];
                          updated[idx].operator = e.target.value;
                          setConditions(updated);
                        }}
                        className="w-1/3 px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-[11px]"
                      >
                        <option value="EQUALS">EQUALS</option>
                        <option value="NOT_EQUALS">NOT EQUALS</option>
                        <option value="GREATER_THAN">GREATER THAN</option>
                        <option value="LESS_THAN">LESS THAN</option>
                        <option value="CONTAINS">CONTAINS</option>
                        <option value="IS_NOT_EMPTY">IS NOT EMPTY</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Value"
                        value={cond.value}
                        onChange={(e) => {
                          const updated = [...conditions];
                          updated[idx].value = e.target.value;
                          setConditions(updated);
                        }}
                        className="w-1/3 px-2 py-1 bg-white border border-slate-200 rounded font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Action Specific Inputs */}
                {actionType === "CLIENT_TYPE_CONVERSION" && (
                  <div className="sm:col-span-2 bg-amber-50 p-3.5 rounded-xl border border-amber-200 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-amber-900 mb-1">
                        Promote Client To Type *
                      </label>
                      <select
                        value={toType}
                        onChange={(e) => setToType(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-amber-300 rounded font-semibold"
                      >
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="PROSPECT">PROSPECT</option>
                        <option value="LEAD">LEAD</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-amber-900 mb-1">Lifecycle Stage</label>
                      <select
                        value={toStage}
                        onChange={(e) => setToStage(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-amber-300 rounded font-semibold"
                      >
                        <option value="WON">WON / CLOSED</option>
                        <option value="QUALIFIED">QUALIFIED</option>
                        <option value="PROPOSAL">PROPOSAL</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block font-semibold text-amber-900 mb-1">
                        Conversion Rationale (Saved in ClientTypeHistory)
                      </label>
                      <input
                        type="text"
                        value={conversionReason}
                        onChange={(e) => setConversionReason(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-amber-300 rounded"
                      />
                    </div>
                  </div>
                )}

                {actionType === "FIELD_UPDATE" && (
                  <div className="sm:col-span-2 bg-blue-50 p-3 rounded-xl border border-blue-200 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-blue-900 mb-1">Target Field Key</label>
                      <input
                        type="text"
                        value={updateFieldName}
                        onChange={(e) => setUpdateFieldName(e.target.value)}
                        placeholder="e.g. status"
                        className="w-full px-2 py-1 bg-white border border-blue-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-blue-900 mb-1">New Value</label>
                      <input
                        type="text"
                        value={updateFieldValue}
                        onChange={(e) => setUpdateFieldValue(e.target.value)}
                        placeholder="e.g. ACTIVE"
                        className="w-full px-2 py-1 bg-white border border-blue-300 rounded font-mono"
                      />
                    </div>
                  </div>
                )}
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isPending ? "Saving..." : isEditMode ? "Update Rule" : "Activate Automation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
