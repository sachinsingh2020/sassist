"use client";

import { useState, useTransition, useMemo } from "react";
import {
  createScheme,
  updateScheme,
  updateSchemeApproval,
  deleteScheme,
  checkSchemeCollisionAction,
  bulkImportSchemes,
} from "@/actions/schemes";
import {
  Tag,
  Plus,
  Percent,
  Gift,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sliders,
  DollarSign,
  Layers,
  Upload,
  Download,
  Trash2,
  Edit,
  X,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ChevronRight,
  Filter,
  Search,
  ShoppingCart,
  Users,
  Eye,
} from "lucide-react";
import DynamicFormRenderer, { FieldDefinitionDTO } from "@/components/custom-fields/DynamicFormRenderer";
import {
  parseFileToRows,
  autoMapSchemeHeaders,
  runSchemeDryRunValidation,
  exportRecordsToCsv,
} from "@/lib/bulkImportClient";
import Link from "next/link";

interface SchemesClientProps {
  initialSchemes: any[];
  products: any[];
  fieldDefinitions?: FieldDefinitionDTO[];
}

export default function SchemesClient({
  initialSchemes,
  products,
  fieldDefinitions = [],
}: SchemesClientProps) {
  const [schemes, setSchemes] = useState(initialSchemes);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedApproval, setSelectedApproval] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Modals & Drawers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [activeDetailScheme, setActiveDetailScheme] = useState<any | null>(null);

  // Loading & alerts
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [collisionWarning, setCollisionWarning] = useState<string | null>(null);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("PERCENTAGE_DISCOUNT");
  const [eligibleClientTypes, setEligibleClientTypes] = useState<string[]>(["ALL"]);
  const [eligibleProductMode, setEligibleProductMode] = useState<"ALL" | "CUSTOM">("ALL");
  const [eligibleProductIds, setEligibleProductIds] = useState<string[]>([]);
  const [minOrderQty, setMinOrderQty] = useState("10");
  const [minOrderValue, setMinOrderValue] = useState("0");
  const [discountPercent, setDiscountPercent] = useState("10");
  const [flatDiscount, setFlatDiscount] = useState("200");
  const [freeSkuCode, setFreeSkuCode] = useState(products[0]?.sku || "");
  const [freeSkuQty, setFreeSkuQty] = useState("1");
  const [slabTiers, setSlabTiers] = useState<Array<{ minQty: number; discountPercent: number }>>([
    { minQty: 10, discountPercent: 5 },
    { minQty: 50, discountPercent: 10 },
  ]);
  const [maxDiscountCap, setMaxDiscountCap] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [approvalStatus, setApprovalStatus] = useState("APPROVED");
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Bulk Import state
  const [importStep, setImportStep] = useState<"UPLOAD" | "PREVIEW">("UPLOAD");
  const [importValidation, setImportValidation] = useState<any>(null);

  // Filtered Schemes
  const filteredSchemes = useMemo(() => {
    return schemes.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = selectedType === "ALL" || s.type === selectedType;
      const matchesApproval = selectedApproval === "ALL" || s.approvalStatus === selectedApproval;
      const matchesStatus = selectedStatus === "ALL" || s.status === selectedStatus;

      return matchesSearch && matchesType && matchesApproval && matchesStatus;
    });
  }, [schemes, searchTerm, selectedType, selectedApproval, selectedStatus]);

  // KPIs
  const totalActive = schemes.filter((s) => s.status === "ACTIVE" && s.approvalStatus === "APPROVED").length;
  const pendingCount = schemes.filter((s) => s.approvalStatus === "PENDING_APPROVAL").length;
  const totalApplications = schemes.reduce((acc, s) => acc + (s._count?.applicationLogs || 0), 0);

  // Collision check trigger
  async function triggerCollisionCheck() {
    if (!code || !startDate || !endDate) return;
    try {
      const collisions = await checkSchemeCollisionAction({
        id: editingId || undefined,
        code,
        startDate,
        endDate,
        eligibleProductIds: eligibleProductMode === "ALL" ? ["ALL"] : eligibleProductIds,
        eligibleClientTypes,
        type,
      });

      if (collisions.length > 0) {
        setCollisionWarning(
          `Conflict Warning: ${collisions[0].message} (Conflicting with ${collisions[0].conflictingSchemeTitle})`
        );
      } else {
        setCollisionWarning(null);
      }
    } catch {
      // Ignore
    }
  }

  // Open Edit
  function handleOpenEdit(scheme: any) {
    setEditingId(scheme.id);
    setIsEditMode(true);
    setTitle(scheme.title || "");
    setCode(scheme.code || "");
    setDescription(scheme.description || "");
    setType(scheme.type || "PERCENTAGE_DISCOUNT");

    try {
      setEligibleClientTypes(
        scheme.eligibleClientTypesJson ? JSON.parse(scheme.eligibleClientTypesJson) : ["ALL"]
      );
    } catch {
      setEligibleClientTypes(["ALL"]);
    }

    try {
      const pIds = scheme.eligibleProductIdsJson ? JSON.parse(scheme.eligibleProductIdsJson) : ["ALL"];
      if (pIds.includes("ALL")) {
        setEligibleProductMode("ALL");
        setEligibleProductIds([]);
      } else {
        setEligibleProductMode("CUSTOM");
        setEligibleProductIds(pIds);
      }
    } catch {
      setEligibleProductMode("ALL");
    }

    setMinOrderQty(String(scheme.minOrderQty || 1));
    setMinOrderValue(String(scheme.minOrderValue || 0));
    setDiscountPercent(String(scheme.discountPercent || 0));
    setFlatDiscount(String(scheme.flatDiscount || 0));
    setFreeSkuCode(scheme.freeSkuCode || products[0]?.sku || "");
    setFreeSkuQty(String(scheme.freeSkuQty || 1));

    try {
      setSlabTiers(
        scheme.slabTiersJson
          ? JSON.parse(scheme.slabTiersJson)
          : [
              { minQty: 10, discountPercent: 5 },
              { minQty: 50, discountPercent: 10 },
            ]
      );
    } catch {
      setSlabTiers([]);
    }

    setMaxDiscountCap(scheme.maxDiscountCap ? String(scheme.maxDiscountCap) : "");
    setStartDate(scheme.startDate ? new Date(scheme.startDate).toISOString().slice(0, 10) : "");
    setEndDate(scheme.endDate ? new Date(scheme.endDate).toISOString().slice(0, 10) : "");
    setApprovalStatus(scheme.approvalStatus || "APPROVED");
    setCustomFields(scheme.customFields || {});
    setCollisionWarning(null);
    setIsModalOpen(true);
  }

  // Submit Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const payload = {
          title,
          code,
          description,
          type,
          eligibleClientTypes,
          eligibleProductIds: eligibleProductMode === "ALL" ? ["ALL"] : eligibleProductIds,
          minOrderQty: parseInt(minOrderQty) || 1,
          minOrderValue: parseFloat(minOrderValue) || 0,
          discountPercent: type === "PERCENTAGE_DISCOUNT" ? parseFloat(discountPercent) : 0,
          flatDiscount: type === "FLAT_DISCOUNT" ? parseFloat(flatDiscount) : 0,
          freeSkuCode: type === "BOGO" ? freeSkuCode : undefined,
          freeSkuQty: type === "BOGO" ? parseInt(freeSkuQty) : 0,
          slabTiers: type === "TIERED_SLAB" ? slabTiers : undefined,
          maxDiscountCap: maxDiscountCap ? parseFloat(maxDiscountCap) : undefined,
          startDate,
          endDate,
          approvalStatus,
          customFields,
        };

        if (isEditMode && editingId) {
          const res = await updateScheme({ id: editingId, ...payload });
          if (res.success && res.scheme) {
            setSchemes(schemes.map((s) => (s.id === editingId ? res.scheme : s)));
            if (activeDetailScheme?.id === editingId) setActiveDetailScheme(res.scheme);
            setMessage({ type: "success", text: `Scheme '${res.scheme.title}' updated successfully!` });
            setIsModalOpen(false);
          }
        } else {
          const res = await createScheme(payload);
          if (res.success && res.scheme) {
            setSchemes([res.scheme, ...schemes]);
            setMessage({ type: "success", text: `Trade Scheme '${res.scheme.title}' launched!` });
            setIsModalOpen(false);
            resetForm();
          }
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to save scheme" });
      }
    });
  }

  // Approval status update
  async function handleApproval(id: string, status: string) {
    startTransition(async () => {
      try {
        const res = await updateSchemeApproval(id, status);
        if (res.success && res.scheme) {
          setSchemes(schemes.map((s) => (s.id === id ? res.scheme : s)));
          if (activeDetailScheme?.id === id) setActiveDetailScheme(res.scheme);
          setMessage({ type: "success", text: `Scheme approval changed to ${status}.` });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to update approval" });
      }
    });
  }

  // Delete
  async function handleDelete(id: string, schemeTitle: string) {
    if (!confirm(`Are you sure you want to delete scheme '${schemeTitle}'?`)) return;
    startTransition(async () => {
      try {
        const res = await deleteScheme(id);
        if (res.success) {
          setSchemes(schemes.filter((s) => s.id !== id));
          if (activeDetailScheme?.id === id) setActiveDetailScheme(null);
          setMessage({ type: "success", text: `Scheme '${schemeTitle}' deleted.` });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to delete scheme" });
      }
    });
  }

  // Bulk Import
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseFileToRows(file);
      const mapping = autoMapSchemeHeaders(parsed.headers);
      const validation = runSchemeDryRunValidation(parsed.rows, mapping);
      setImportValidation(validation);
      setImportStep("PREVIEW");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function executeBulkImport() {
    if (!importValidation?.sanitizedRecords) return;
    startTransition(async () => {
      try {
        const res = await bulkImportSchemes(importValidation.sanitizedRecords);
        if (res.success) {
          setMessage({ type: "success", text: `Imported ${res.count} trade schemes successfully!` });
          setIsBulkImportOpen(false);
          window.location.reload();
        }
      } catch (err: any) {
        alert("Import failed: " + err.message);
      }
    });
  }

  function handleExportCsv() {
    const exportData = filteredSchemes.map((s) => ({
      Code: s.code,
      Title: s.title,
      Type: s.type,
      MinQty: s.minOrderQty,
      MinOrderValue: s.minOrderValue || 0,
      DiscountPercent: s.discountPercent || 0,
      FlatDiscount: s.flatDiscount || 0,
      FreeSku: s.freeSkuCode || "",
      StartDate: new Date(s.startDate).toISOString().slice(0, 10),
      EndDate: new Date(s.endDate).toISOString().slice(0, 10),
      Status: s.status,
      ApprovalStatus: s.approvalStatus,
    }));
    exportRecordsToCsv(`Trade_Schemes_${new Date().toISOString().slice(0, 10)}`, exportData);
  }

  function resetForm() {
    setEditingId(null);
    setIsEditMode(false);
    setTitle("");
    setCode("");
    setDescription("");
    setType("PERCENTAGE_DISCOUNT");
    setEligibleClientTypes(["ALL"]);
    setEligibleProductMode("ALL");
    setEligibleProductIds([]);
    setMinOrderQty("10");
    setMinOrderValue("0");
    setDiscountPercent("10");
    setFlatDiscount("200");
    setFreeSkuCode(products[0]?.sku || "");
    setFreeSkuQty("1");
    setSlabTiers([
      { minQty: 10, discountPercent: 5 },
      { minQty: 50, discountPercent: 10 },
    ]);
    setMaxDiscountCap("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setApprovalStatus("APPROVED");
    setCustomFields({});
    setCollisionWarning(null);
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-600/10 text-rose-600">
              <Tag className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Scheme Master & Trade Promotion Engine
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure trade discounts, tiered slab incentives, promotional BOGO free goods, and conflict-checked schemes.
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
              setImportStep("UPLOAD");
              setIsBulkImportOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            Import CSV
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Create Scheme
          </button>
        </div>
      </div>

      {/* Alert Notification */}
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
            <span className="text-xs font-medium text-slate-500">Live Promotions</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{totalActive}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Active in Order Pad</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Approvals</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{pendingCount}</p>
          <span className="text-[11px] text-amber-600 font-medium">Requires Commercial Sign-off</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Schemes</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Tag className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{schemes.length}</p>
          <span className="text-[11px] text-slate-500">In trade repository</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Order Applications</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <ShoppingCart className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{totalApplications}</p>
          <span className="text-[11px] text-indigo-600 font-medium">Transactions benefited</span>
        </div>
      </div>

      {/* Multi-Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search scheme code or title..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800"
            />
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Scheme Types</option>
              <option value="PERCENTAGE_DISCOUNT">Percentage Discount (%)</option>
              <option value="FLAT_DISCOUNT">Flat Discount (₹)</option>
              <option value="BOGO">Buy-One-Get-One (BOGO)</option>
              <option value="TIERED_SLAB">Tiered Volume Slabs</option>
            </select>
          </div>

          <div>
            <select
              value={selectedApproval}
              onChange={(e) => setSelectedApproval(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Approval Statuses</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
              <option value="DRAFT">DRAFT</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSchemes.map((s) => {
          let clientTypes = ["ALL"];
          try {
            if (s.eligibleClientTypesJson) clientTypes = JSON.parse(s.eligibleClientTypesJson);
          } catch {}

          return (
            <div
              key={s.id}
              onClick={() => setActiveDetailScheme(s)}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition cursor-pointer space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200/60">
                      {s.code}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        s.approvalStatus === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                          : s.approvalStatus === "PENDING_APPROVAL"
                          ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s.approvalStatus}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-2">{s.title}</h3>
                  {s.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{s.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.title)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Benefit pill */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {s.type === "BOGO" ? (
                    <Gift className="h-4 w-4 text-rose-500 shrink-0" />
                  ) : s.type === "TIERED_SLAB" ? (
                    <Layers className="h-4 w-4 text-purple-500 shrink-0" />
                  ) : (
                    <Percent className="h-4 w-4 text-indigo-500 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-800">
                    {s.type === "BOGO"
                      ? `Buy ${s.minOrderQty} Qty -> Get ${s.freeSkuQty || 1} Free (${s.freeSkuCode})`
                      : s.type === "FLAT_DISCOUNT"
                      ? `Min ${s.minOrderQty} Qty -> Flat ₹${s.flatDiscount} Off`
                      : s.type === "TIERED_SLAB"
                      ? `Tiered Volume Slabs (up to 20% trade incentive)`
                      : `Min ${s.minOrderQty} Qty -> ${s.discountPercent}% Flat Trade Discount`}
                  </span>
                </div>
              </div>

              {/* Eligibility & Thresholds */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                  <Users className="h-3 w-3" />
                  {clientTypes.includes("ALL") ? "All Accounts" : clientTypes.join(", ")}
                </span>
                {s.minOrderValue > 0 && (
                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
                    Min ₹{s.minOrderValue.toLocaleString()} MOV
                  </span>
                )}
                <span className="text-slate-400">
                  {s._count?.applicationLogs || 0} order(s) applied
                </span>
              </div>

              {/* Dates & Status footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  {new Date(s.startDate).toLocaleDateString()} – {new Date(s.endDate).toLocaleDateString()}
                </span>
                <span className="font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  {s.status}
                </span>
              </div>
            </div>
          );
        })}
        {filteredSchemes.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            No trade schemes found matching your search.
          </div>
        )}
      </div>

      {/* Scheme Detail Slide-Over Drawer */}
      {activeDetailScheme && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60">
                  {activeDetailScheme.code}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {activeDetailScheme.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Type: {activeDetailScheme.type} | Approval: {activeDetailScheme.approvalStatus}
                </p>
              </div>
              <button
                onClick={() => setActiveDetailScheme(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-6 flex-1 text-xs">
              {/* Approval Action Buttons */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Approval State
                  </span>
                  <span className="font-bold text-slate-800">{activeDetailScheme.approvalStatus}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {activeDetailScheme.approvalStatus !== "APPROVED" && (
                    <button
                      onClick={() => handleApproval(activeDetailScheme.id, "APPROVED")}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition"
                    >
                      Approve Scheme
                    </button>
                  )}
                  {activeDetailScheme.approvalStatus !== "REJECTED" && (
                    <button
                      onClick={() => handleApproval(activeDetailScheme.id, "REJECTED")}
                      className="px-2.5 py-1 border border-rose-200 text-rose-600 rounded text-xs font-semibold hover:bg-rose-50 transition"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>

              {/* Eligibility Rules */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Eligibility & Thresholds
                </h3>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Client Account Types</span>
                    <span className="font-semibold text-slate-800">
                      {activeDetailScheme.eligibleClientTypesJson || "ALL"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Product Scope</span>
                    <span className="font-semibold text-slate-800">
                      {activeDetailScheme.eligibleProductIdsJson === '["ALL"]'
                        ? "Universal (All Products)"
                        : "Specific SKU Set"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Min Qualifying Qty</span>
                    <span className="font-semibold text-slate-800">{activeDetailScheme.minOrderQty} units</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Min Order Value (MOV)</span>
                    <span className="font-semibold text-slate-800">
                      ₹{activeDetailScheme.minOrderValue ? activeDetailScheme.minOrderValue.toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Application History */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-600">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  Transaction Application History ({activeDetailScheme.applicationLogs?.length || 0})
                </h3>
                {activeDetailScheme.applicationLogs && activeDetailScheme.applicationLogs.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Order / Date</th>
                          <th className="py-2 px-2 text-right">Order Value</th>
                          <th className="py-2 px-3 text-right">Discount Applied</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {activeDetailScheme.applicationLogs.map((log: any) => (
                          <tr key={log.id}>
                            <td className="py-2 px-3 font-mono text-slate-700">
                              <div>{log.orderNumber || "Direct Order"}</div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(log.appliedAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              ₹{log.orderSubtotal.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600">
                              -₹{log.discountAmount.toFixed(2)}
                              {log.freeSkuCode && ` + ${log.freeSkuQty}x ${log.freeSkuCode}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No transactions have applied this scheme yet.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => handleOpenEdit(activeDetailScheme)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Scheme
              </button>
              <button
                onClick={() => handleDelete(activeDetailScheme.id, activeDetailScheme.title)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 text-rose-600 bg-rose-50 rounded-lg text-xs font-semibold hover:bg-rose-100 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Scheme Modal Wizard */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tag className="h-5 w-5 text-rose-600" />
                {isEditMode ? `Edit Scheme: ${code}` : "Configure Trade Promotion Scheme"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {collisionWarning && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{collisionWarning}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Scheme Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q3 Monsoon Wholesale Namkeen Offer"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scheme Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onBlur={triggerCollisionCheck}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. SCH-MONSOON-26"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scheme Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-semibold"
                  >
                    <option value="PERCENTAGE_DISCOUNT">Percentage Discount (%)</option>
                    <option value="FLAT_DISCOUNT">Flat Amount Off (₹)</option>
                    <option value="BOGO">Buy-One-Get-One (BOGO Free Good)</option>
                    <option value="TIERED_SLAB">Tiered Volume Slabs</option>
                  </select>
                </div>

                {/* Eligible Client Types */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Eligible Account / Client Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["ALL", "CUSTOMER", "PROSPECT", "LEAD"].map((ct) => {
                      const isSelected = eligibleClientTypes.includes(ct);
                      return (
                        <button
                          key={ct}
                          type="button"
                          onClick={() => {
                            if (ct === "ALL") {
                              setEligibleClientTypes(["ALL"]);
                            } else {
                              const withoutAll = eligibleClientTypes.filter((c) => c !== "ALL");
                              if (isSelected) {
                                const next = withoutAll.filter((c) => c !== ct);
                                setEligibleClientTypes(next.length === 0 ? ["ALL"] : next);
                              } else {
                                setEligibleClientTypes([...withoutAll, ct]);
                              }
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                            isSelected
                              ? "bg-rose-50 text-rose-700 border-rose-300"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {ct}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Thresholds */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Order Qty (MOQ)</label>
                  <input
                    type="number"
                    min="1"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Min Order Value (₹ MOV)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono"
                  />
                </div>

                {/* Type specific benefits */}
                {type === "PERCENTAGE_DISCOUNT" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Discount Percentage (%) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="100"
                      required
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono font-bold"
                    />
                  </div>
                )}

                {type === "FLAT_DISCOUNT" && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Flat Discount (₹) *</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={flatDiscount}
                      onChange={(e) => setFlatDiscount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono font-bold"
                    />
                  </div>
                )}

                {type === "BOGO" && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Free SKU *</label>
                      <select
                        value={freeSkuCode}
                        onChange={(e) => setFreeSkuCode(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-mono"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.sku}>
                            {p.sku} - {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Free Units Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={freeSkuQty}
                        onChange={(e) => setFreeSkuQty(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono"
                      />
                    </div>
                  </>
                )}

                {type === "TIERED_SLAB" && (
                  <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <label className="block font-semibold text-slate-800">
                      Tiered Volume Slab Schedule
                    </label>
                    {slabTiers.map((tier, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-slate-500 text-[11px]">Min Units:</span>
                        <input
                          type="number"
                          value={tier.minQty}
                          onChange={(e) => {
                            const newTiers = [...slabTiers];
                            newTiers[idx].minQty = parseInt(e.target.value) || 0;
                            setSlabTiers(newTiers);
                          }}
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded font-mono"
                        />
                        <span className="text-slate-500 text-[11px]">Discount %:</span>
                        <input
                          type="number"
                          value={tier.discountPercent}
                          onChange={(e) => {
                            const newTiers = [...slabTiers];
                            newTiers[idx].discountPercent = parseFloat(e.target.value) || 0;
                            setSlabTiers(newTiers);
                          }}
                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setSlabTiers(slabTiers.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setSlabTiers([...slabTiers, { minQty: 100, discountPercent: 15 }])
                      }
                      className="text-xs text-rose-600 font-semibold hover:underline mt-1 block"
                    >
                      + Add Slab Tier
                    </button>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onBlur={triggerCollisionCheck}
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
                    onBlur={triggerCollisionCheck}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Approval Status</label>
                  <select
                    value={approvalStatus}
                    onChange={(e) => setApprovalStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-semibold"
                  >
                    <option value="APPROVED">APPROVED (Active Live)</option>
                    <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
                    <option value="DRAFT">DRAFT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Max Discount Cap (₹ Optional)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={maxDiscountCap}
                    onChange={(e) => setMaxDiscountCap(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono"
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isPending ? "Saving..." : isEditMode ? "Update Scheme" : "Launch Promotion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                Bulk Scheme Importer (CSV)
              </h2>
              <button onClick={() => setIsBulkImportOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {importStep === "UPLOAD" && (
              <div className="space-y-4 mt-4 text-xs">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-rose-500 transition cursor-pointer bg-slate-50">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="schemeBulkUploadInput"
                  />
                  <label htmlFor="schemeBulkUploadInput" className="cursor-pointer space-y-2 block">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="font-semibold text-slate-700">Choose CSV or Excel spreadsheet</p>
                    <p className="text-slate-400 text-[11px]">Headers: Code, Title, Type, Min Qty, Discount %, Start Date, End Date</p>
                  </label>
                </div>
              </div>
            )}

            {importStep === "PREVIEW" && importValidation && (
              <div className="space-y-4 mt-4 text-xs">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Total</span>
                    <span className="text-base font-bold text-slate-900">{importValidation.totalRows}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-emerald-700 block">Valid</span>
                    <span className="text-base font-bold text-emerald-700">{importValidation.validCount}</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-rose-700 block">Errors</span>
                    <span className="text-base font-bold text-rose-700">{importValidation.errorCount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setImportStep("UPLOAD")}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={executeBulkImport}
                    disabled={importValidation.validCount === 0 || isPending}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {isPending ? "Importing..." : `Import ${importValidation.validCount} Schemes`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
