"use client";

import { useState, useTransition, useMemo } from "react";
import {
  createTarget,
  updateTarget,
  updateTargetApproval,
  deleteTarget,
  refreshAllTargetAchievements,
  bulkImportTargets,
} from "@/actions/targets";
import {
  Target,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sliders,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Calendar,
  Layers,
  Users,
  MapPin,
  Package,
  Award,
  Upload,
  Download,
  Trash2,
  Edit,
  X,
  Clock,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import DynamicFormRenderer, { FieldDefinitionDTO } from "@/components/custom-fields/DynamicFormRenderer";
import { exportRecordsToCsv } from "@/lib/bulkImportClient";
import Link from "next/link";

interface TargetClientProps {
  initialTargets: any[];
  employees: any[];
  products: any[];
  territories: any[];
  fieldDefinitions?: FieldDefinitionDTO[];
}

export default function TargetClient({
  initialTargets,
  employees,
  products,
  territories,
  fieldDefinitions = [],
}: TargetClientProps) {
  const [targets, setTargets] = useState(initialTargets);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("ALL");
  const [selectedMetric, setSelectedMetric] = useState("ALL");
  const [selectedDimension, setSelectedDimension] = useState("ALL");
  const [selectedApproval, setSelectedApproval] = useState("ALL");

  // Modals & Drawer
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeDetailTarget, setActiveDetailTarget] = useState<any | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Loading & notification
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [targetCode, setTargetCode] = useState("");
  const [description, setDescription] = useState("");
  const [targetPeriod, setTargetPeriod] = useState("MONTHLY");
  const [targetMetric, setTargetMetric] = useState("SALES_VALUE");
  const [dimension, setDimension] = useState("EMPLOYEE");
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [territoryId, setTerritoryId] = useState(territories[0]?.id || "");
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [teamName, setTeamName] = useState("");
  const [targetQuantity, setTargetQuantity] = useState("100");
  const [targetValue, setTargetValue] = useState("250000");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [approvalStatus, setApprovalStatus] = useState("APPROVED");
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Filtered Targets
  const filteredTargets = useMemo(() => {
    return targets.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.targetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.employee?.name && t.employee.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.territory?.name && t.territory.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchPeriod = selectedPeriod === "ALL" || t.targetPeriod === selectedPeriod;
      const matchMetric = selectedMetric === "ALL" || t.targetMetric === selectedMetric;
      const matchDimension = selectedDimension === "ALL" || t.dimension === selectedDimension;
      const matchApproval = selectedApproval === "ALL" || t.approvalStatus === selectedApproval;

      return matchSearch && matchPeriod && matchMetric && matchDimension && matchApproval;
    });
  }, [targets, searchTerm, selectedPeriod, selectedMetric, selectedDimension, selectedApproval]);

  // Executive KPI Aggregations
  const totalTargetValue = targets.reduce((acc, t) => acc + (t.targetValue || 0), 0);
  const totalActualValue = targets.reduce((acc, t) => acc + (t.actualValue || 0), 0);
  const overallAchievementRate =
    totalTargetValue > 0 ? Math.round((totalActualValue / totalTargetValue) * 1000) / 10 : 0;
  const atRiskCount = targets.filter(
    (t) => (t.achievementRate || 0) < 60 && t.status === "ACTIVE"
  ).length;

  // Open Edit
  function handleOpenEdit(t: any) {
    setEditingId(t.id);
    setIsEditMode(true);
    setTitle(t.title || "");
    setTargetCode(t.targetCode || "");
    setDescription(t.description || "");
    setTargetPeriod(t.targetPeriod || "MONTHLY");
    setTargetMetric(t.targetMetric || "SALES_VALUE");
    setDimension(t.dimension || "EMPLOYEE");
    setEmployeeId(t.employeeId || employees[0]?.id || "");
    setTerritoryId(t.territoryId || territories[0]?.id || "");
    setProductId(t.productId || products[0]?.id || "");
    setTeamName(t.teamName || "");
    setTargetQuantity(String(t.targetQuantity || 0));
    setTargetValue(String(t.targetValue || 0));
    setStartDate(t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : "");
    setEndDate(t.endDate ? new Date(t.endDate).toISOString().slice(0, 10) : "");
    setApprovalStatus(t.approvalStatus || "APPROVED");
    setCustomFields(t.customFields || {});
    setIsModalOpen(true);
  }

  // Handle Form Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const payload = {
          title,
          targetCode,
          description,
          targetPeriod,
          targetMetric,
          dimension,
          employeeId: dimension === "EMPLOYEE" ? employeeId : undefined,
          territoryId: dimension === "TERRITORY" ? territoryId : undefined,
          productId: dimension === "PRODUCT" ? productId : undefined,
          teamName: dimension === "TEAM" ? teamName : undefined,
          targetQuantity: parseFloat(targetQuantity) || 0,
          targetValue: parseFloat(targetValue) || 0,
          startDate,
          endDate,
          approvalStatus,
          customFields,
        };

        if (isEditMode && editingId) {
          const res = await updateTarget({ id: editingId, ...payload });
          if (res.success && res.target) {
            setTargets(targets.map((t) => (t.id === editingId ? res.target : t)));
            if (activeDetailTarget?.id === editingId) setActiveDetailTarget(res.target);
            setMessage({ type: "success", text: `Target '${res.target.title}' updated successfully!` });
            setIsModalOpen(false);
          }
        } else {
          const res = await createTarget(payload);
          if (res.success && res.target) {
            setTargets([res.target, ...targets]);
            setMessage({ type: "success", text: `Target '${res.target.title}' successfully assigned!` });
            setIsModalOpen(false);
            resetForm();
          }
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to save target" });
      }
    });
  }

  // Handle Approval Update
  async function handleApproval(id: string, status: string) {
    startTransition(async () => {
      try {
        const res = await updateTargetApproval(id, status);
        if (res.success && res.target) {
          setTargets(targets.map((t) => (t.id === id ? res.target : t)));
          if (activeDetailTarget?.id === id) setActiveDetailTarget(res.target);
          setMessage({ type: "success", text: `Target approval state set to ${status}.` });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Approval update failed" });
      }
    });
  }

  // Handle Delete
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete target '${name}'? This action is permanent.`)) return;
    startTransition(async () => {
      try {
        const res = await deleteTarget(id);
        if (res.success) {
          setTargets(targets.filter((t) => t.id !== id));
          if (activeDetailTarget?.id === id) setActiveDetailTarget(null);
          setMessage({ type: "success", text: `Target '${name}' deleted.` });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to delete target" });
      }
    });
  }

  // Live Recalculate All
  async function handleRefreshAchievements() {
    startTransition(async () => {
      try {
        const res = await refreshAllTargetAchievements();
        if (res.success) {
          setMessage({
            type: "success",
            text: `Recalculated achievements for ${res.count} active targets from live sales and order pad records!`,
          });
          window.location.reload();
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Recalculation failed" });
      }
    });
  }

  function handleExportCsv() {
    const exportData = filteredTargets.map((t) => ({
      TargetCode: t.targetCode,
      Title: t.title,
      Period: t.targetPeriod,
      Metric: t.targetMetric,
      Dimension: t.dimension,
      AssignedEntity:
        t.dimension === "EMPLOYEE"
          ? t.employee?.name || "N/A"
          : t.dimension === "TERRITORY"
          ? t.territory?.name || "N/A"
          : t.dimension === "PRODUCT"
          ? t.product?.name || "N/A"
          : t.teamName || "General",
      TargetValue: t.targetValue || 0,
      ActualValue: t.actualValue || 0,
      TargetQuantity: t.targetQuantity || 0,
      ActualQuantity: t.actualQuantity || 0,
      AchievementRate: `${t.achievementRate || 0}%`,
      StartDate: new Date(t.startDate).toISOString().slice(0, 10),
      EndDate: new Date(t.endDate).toISOString().slice(0, 10),
      Status: t.status,
      ApprovalStatus: t.approvalStatus,
    }));
    exportRecordsToCsv(`Target_Master_${new Date().toISOString().slice(0, 10)}`, exportData);
  }

  function resetForm() {
    setEditingId(null);
    setIsEditMode(false);
    setTitle("");
    setTargetCode(`TGT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setDescription("");
    setTargetPeriod("MONTHLY");
    setTargetMetric("SALES_VALUE");
    setDimension("EMPLOYEE");
    setEmployeeId(employees[0]?.id || "");
    setTerritoryId(territories[0]?.id || "");
    setProductId(products[0]?.id || "");
    setTeamName("");
    setTargetQuantity("100");
    setTargetValue("250000");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setApprovalStatus("APPROVED");
    setCustomFields({});
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Target Master & Commercial Quota Engine
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-dimensional quotas (Employee, Territory, Product, Team), automated live revenue realization, and performance tracking.
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
            onClick={handleRefreshAchievements}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            Recalculate Achievements
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Export CSV
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Assign Target
          </button>
        </div>
      </div>

      {/* Notification banner */}
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
            <span className="text-xs font-medium text-slate-500">Target Pipeline</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <DollarSign className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            ₹{(totalTargetValue / 100000).toFixed(2)} Lakhs
          </p>
          <span className="text-[11px] text-slate-500">Total quota commitments</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Actual Realized</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">
            ₹{(totalActualValue / 100000).toFixed(2)} Lakhs
          </p>
          <span className="text-[11px] text-emerald-600 font-medium">Delivered order value</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Quota Achievement</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Award className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{overallAchievementRate}%</p>
          <span className="text-[11px] text-slate-500">Overall realization rate</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Quotas at Risk</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{atRiskCount}</p>
          <span className="text-[11px] text-rose-600 font-medium">&lt;60% realization</span>
        </div>
      </div>

      {/* Multi-Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search target code, title, employee, territory..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
            />
          </div>

          <div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Periods ({targets.length})</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
              <option value="WEEKLY">Weekly</option>
              <option value="DAILY">Daily</option>
            </select>
          </div>

          <div>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Metrics</option>
              <option value="SALES_VALUE">Sales Revenue (₹)</option>
              <option value="SALES_VOLUME">Sales Volume (Units)</option>
              <option value="VISITS_COUNT">Field Visits Count</option>
              <option value="NEW_CLIENTS">New Client Leads</option>
            </select>
          </div>

          <div>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Dimensions</option>
              <option value="EMPLOYEE">By Employee</option>
              <option value="TERRITORY">By Territory</option>
              <option value="PRODUCT">By Product SKU</option>
              <option value="TEAM">By Regional Team</option>
            </select>
          </div>
        </div>
      </div>

      {/* Targets Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Code / Quota Title</th>
                <th className="py-3 px-4">Assigned Dimension</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4 text-right">Target Goal</th>
                <th className="py-3 px-4 text-right">Actual Realized</th>
                <th className="py-3 px-4 w-48">Achievement Progress</th>
                <th className="py-3 px-4 text-center">Approval</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTargets.map((t) => {
                const rate = t.achievementRate || 0;
                const isValue = t.targetMetric === "SALES_VALUE";
                const goalFormatted = isValue
                  ? `₹${Number(t.targetValue).toLocaleString()}`
                  : `${t.targetQuantity} units`;
                const actualFormatted = isValue
                  ? `₹${Number(t.actualValue).toLocaleString()}`
                  : `${t.actualQuantity} units`;

                return (
                  <tr
                    key={t.id}
                    onClick={() => setActiveDetailTarget(t)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/60 mr-2">
                        {t.targetCode}
                      </span>
                      <span className="font-semibold text-slate-900">{t.title}</span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {t.dimension === "EMPLOYEE" ? (
                          <Users className="h-3.5 w-3.5 text-indigo-500" />
                        ) : t.dimension === "TERRITORY" ? (
                          <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Package className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        <span className="font-medium text-slate-800">
                          {t.dimension === "EMPLOYEE"
                            ? t.employee?.name || "Direct Rep"
                            : t.dimension === "TERRITORY"
                            ? t.territory?.name || "Territory"
                            : t.dimension === "PRODUCT"
                            ? t.product?.name || "SKU"
                            : t.teamName || "General"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 capitalize">{t.dimension.toLowerCase()}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {t.targetPeriod}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                      {goalFormatted}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-indigo-600">
                      {actualFormatted}
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span
                            className={`font-bold ${
                              rate >= 100
                                ? "text-emerald-600"
                                : rate >= 75
                                ? "text-blue-600"
                                : rate >= 50
                                ? "text-amber-600"
                                : "text-rose-600"
                            }`}
                          >
                            {rate}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {rate >= 100 ? "Achieved" : "In Progress"}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${
                              rate >= 100
                                ? "bg-emerald-500"
                                : rate >= 75
                                ? "bg-blue-500"
                                : rate >= 50
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.approvalStatus === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : t.approvalStatus === "PENDING_APPROVAL"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t.approvalStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.title)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTargets.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No commercial targets found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Target Detail Slide-over Drawer */}
      {activeDetailTarget && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                  {activeDetailTarget.targetCode}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {activeDetailTarget.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Period: {activeDetailTarget.targetPeriod} | Metric: {activeDetailTarget.targetMetric}
                </p>
              </div>
              <button
                onClick={() => setActiveDetailTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-6 flex-1 text-xs">
              {/* Progress Summary Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Realization Progress</span>
                  <span className="font-extrabold text-sm text-indigo-600">
                    {activeDetailTarget.achievementRate || 0}% Achieved
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, activeDetailTarget.achievementRate || 0))}%`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Committed Goal</span>
                    <span className="font-bold text-slate-900">
                      ₹{Number(activeDetailTarget.targetValue || 0).toLocaleString()} (
                      {activeDetailTarget.targetQuantity} units)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Actual Realized</span>
                    <span className="font-bold text-emerald-600">
                      ₹{Number(activeDetailTarget.actualValue || 0).toLocaleString()} (
                      {activeDetailTarget.actualQuantity} units)
                    </span>
                  </div>
                </div>
              </div>

              {/* Approval Action */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Approval Status
                  </span>
                  <span className="font-bold text-slate-800">{activeDetailTarget.approvalStatus}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {activeDetailTarget.approvalStatus !== "APPROVED" && (
                    <button
                      onClick={() => handleApproval(activeDetailTarget.id, "APPROVED")}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition"
                    >
                      Approve Target
                    </button>
                  )}
                  {activeDetailTarget.approvalStatus !== "REJECTED" && (
                    <button
                      onClick={() => handleApproval(activeDetailTarget.id, "REJECTED")}
                      className="px-2.5 py-1 border border-rose-200 text-rose-600 rounded text-xs font-semibold hover:bg-rose-50 transition"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>

              {/* Assignment Details */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-600">
                  <Award className="h-4 w-4 text-indigo-600" />
                  Target Assignment Scope
                </h3>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Dimension</span>
                    <span className="font-semibold text-slate-800">{activeDetailTarget.dimension}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Entity Name</span>
                    <span className="font-semibold text-slate-800">
                      {activeDetailTarget.dimension === "EMPLOYEE"
                        ? activeDetailTarget.employee?.name || "Direct Rep"
                        : activeDetailTarget.dimension === "TERRITORY"
                        ? activeDetailTarget.territory?.name || "Territory"
                        : activeDetailTarget.dimension === "PRODUCT"
                        ? activeDetailTarget.product?.name || "SKU"
                        : activeDetailTarget.teamName || "General"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Effective Window</span>
                    <span className="font-medium text-slate-700">
                      {new Date(activeDetailTarget.startDate).toLocaleDateString()} to{" "}
                      {new Date(activeDetailTarget.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Status</span>
                    <span className="font-semibold text-slate-800">{activeDetailTarget.status}</span>
                  </div>
                </div>
              </div>

              {/* Custom fields */}
              {activeDetailTarget.customFields && Object.keys(activeDetailTarget.customFields).length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-600">
                    <Sliders className="h-4 w-4 text-purple-600" />
                    Dynamic Target Attributes
                  </h3>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                    {Object.entries(activeDetailTarget.customFields).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-slate-400 text-[10px] block capitalize">{k.replace(/_/g, " ")}</span>
                        <span className="font-medium text-slate-800">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => handleOpenEdit(activeDetailTarget)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Target
              </button>
              <button
                onClick={() => handleDelete(activeDetailTarget.id, activeDetailTarget.title)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 text-rose-600 bg-rose-50 rounded-lg text-xs font-semibold hover:bg-rose-100 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-600" />
                {isEditMode ? `Edit Target: ${targetCode}` : "Assign New Commercial Quota"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Target Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q3 North Zone Beverages Target"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Code *</label>
                  <input
                    type="text"
                    required
                    value={targetCode}
                    onChange={(e) => setTargetCode(e.target.value)}
                    placeholder="e.g. TGT-2026-NZ-01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Period *</label>
                  <select
                    value={targetPeriod}
                    onChange={(e) => setTargetPeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-semibold"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="DAILY">Daily</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Metric *</label>
                  <select
                    value={targetMetric}
                    onChange={(e) => setTargetMetric(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-semibold"
                  >
                    <option value="SALES_VALUE">Sales Revenue (₹ Value)</option>
                    <option value="SALES_VOLUME">Sales Quantity (Units)</option>
                    <option value="VISITS_COUNT">Field Store Visits Count</option>
                    <option value="NEW_CLIENTS">New Client Leads Onboarded</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quota Dimension *</label>
                  <select
                    value={dimension}
                    onChange={(e) => setDimension(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-semibold"
                  >
                    <option value="EMPLOYEE">Individual Employee / Rep</option>
                    <option value="TERRITORY">Territory Geography</option>
                    <option value="PRODUCT">Specific Product SKU</option>
                    <option value="TEAM">Regional Team</option>
                  </select>
                </div>

                {/* Dimension pickers */}
                {dimension === "EMPLOYEE" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Employee *</label>
                    <select
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.empCode} - {emp.name} ({emp.designation})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {dimension === "TERRITORY" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Territory *</label>
                    <select
                      value={territoryId}
                      onChange={(e) => setTerritoryId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white"
                    >
                      {territories.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.zone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {dimension === "PRODUCT" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Product SKU *</label>
                    <select
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {dimension === "TEAM" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Team Name *</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. North FMCG Express Division"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                )}

                {/* Goals */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Value (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="e.g. 500000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Quantity (Units)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Custom Fields */}
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isPending ? "Saving..." : isEditMode ? "Update Quota" : "Commit Quota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
