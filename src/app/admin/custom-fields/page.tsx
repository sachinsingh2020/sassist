"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Info,
  Layers,
  Settings2,
  FileSpreadsheet,
  Save,
  X,
  RefreshCw,
  Search,
} from "lucide-react";
import DynamicFormRenderer, {
  FieldDefinitionDTO,
} from "@/components/custom-fields/DynamicFormRenderer";

const MODULES = [
  { key: "PRODUCT", label: "Product Master", desc: "Catalog items, pricing, SKUs, inventory" },
  { key: "CLIENT", label: "Client / Lead Master", desc: "Leads, prospects, retailers, accounts" },
  { key: "ADDRESS", label: "Address Master", desc: "Locations, territories, beats, pincodes" },
  { key: "EMPLOYEE", label: "Employee Master", desc: "Sales reps, ASMs, designations, hierarchy" },
  { key: "SCHEME", label: "Scheme Master", desc: "Trade discounts, BOGO, slab benefits" },
  { key: "TARGET", label: "Target Master", desc: "Quotas, periodic goals, metrics" },
  { key: "SLA", label: "SLA Master", desc: "Turnaround times, escalation matrix" },
  { key: "ORDER", label: "Secondary Orders", desc: "Sales orders, fulfillment, invoices" },
];

const DATA_TYPES = [
  { type: "TEXT", label: "Text", desc: "Single line string, code, or identifier" },
  { type: "NUMBER", label: "Number", desc: "Integer or decimal numeric quantity" },
  { type: "CURRENCY", label: "Currency (₹)", desc: "Monetary amount formatted with currency" },
  { type: "DATE", label: "Date", desc: "Calendar date picker" },
  { type: "CHECKBOX", label: "Checkbox (Yes/No)", desc: "Boolean toggle switch" },
  { type: "SELECT", label: "Dropdown Select", desc: "Single choice from configured options" },
  { type: "DEPENDENT_SELECT", label: "Dependent Dropdown", desc: "Cascades based on parent field value" },
  { type: "LOOKUP", label: "Lookup Reference", desc: "References another master table record" },
  { type: "EMAIL", label: "Email Address", desc: "Validated email address with regex" },
  { type: "PHONE", label: "Phone Number", desc: "7-15 digit phone with format check" },
  { type: "GEOLOCATION", label: "Geolocation (GPS)", desc: "Latitude, longitude & accuracy capture" },
];

export default function CustomFieldsAdminPage() {
  const [selectedModule, setSelectedModule] = useState("PRODUCT");
  const [fields, setFields] = useState<FieldDefinitionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinitionDTO | null>(null);

  // Form State for Builder Modal
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    dataType: "TEXT",
    placeholder: "",
    defaultValue: "",
    isRequired: false,
    isUnique: false,
    minVal: "",
    maxVal: "",
    regexPattern: "",
    regexErrorMsg: "",
    optionsText: "",
    dependentOnId: "",
    lookupTarget: "",
    sortOrder: 0,
    showInList: true,
    showInDetail: true,
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch fields for current module
  const fetchFields = async (mod: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/custom-fields?module=${mod}&activeOnly=false`);
      const json = await res.json();
      if (json.success) {
        setFields(json.data);
      }
    } catch (err) {
      console.error("Failed to load fields:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields(selectedModule);
  }, [selectedModule]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingField(null);
    setFormData({
      name: "",
      label: "",
      dataType: "TEXT",
      placeholder: "",
      defaultValue: "",
      isRequired: false,
      isUnique: false,
      minVal: "",
      maxVal: "",
      regexPattern: "",
      regexErrorMsg: "",
      optionsText: "Option 1, Option 2, Option 3",
      dependentOnId: "",
      lookupTarget: "",
      sortOrder: fields.length + 1,
      showInList: true,
      showInDetail: true,
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (field: FieldDefinitionDTO) => {
    setEditingField(field);
    let optionsText = "";
    if (field.optionsJson) {
      try {
        const parsed = JSON.parse(field.optionsJson);
        optionsText = Array.isArray(parsed)
          ? parsed.map((p) => (typeof p === "string" ? p : p.label || p.value)).join(", ")
          : field.optionsJson;
      } catch {
        optionsText = field.optionsJson;
      }
    }

    setFormData({
      name: field.name,
      label: field.label,
      dataType: field.dataType,
      placeholder: field.placeholder || "",
      defaultValue: field.defaultValue || "",
      isRequired: field.isRequired,
      isUnique: field.isUnique || false,
      minVal: field.minVal !== null && field.minVal !== undefined ? String(field.minVal) : "",
      maxVal: field.maxVal !== null && field.maxVal !== undefined ? String(field.maxVal) : "",
      regexPattern: field.regexPattern || "",
      regexErrorMsg: field.regexErrorMsg || "",
      optionsText,
      dependentOnId: field.dependentOnId || "",
      lookupTarget: field.lookupTarget || "",
      sortOrder: field.sortOrder,
      showInList: field.showInList,
      showInDetail: field.showInDetail,
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  // Auto-slugify label into internal name
  const handleLabelChange = (val: string) => {
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    setFormData((prev) => ({
      ...prev,
      label: val,
      name: editingField ? prev.name : slug,
    }));
  };

  // Save handler (Create / Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    let parsedOptions: any = null;
    if (["SELECT", "DEPENDENT_SELECT"].includes(formData.dataType) && formData.optionsText) {
      parsedOptions = formData.optionsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const payload = {
      module: selectedModule,
      name: formData.name,
      label: formData.label,
      dataType: formData.dataType,
      placeholder: formData.placeholder || null,
      defaultValue: formData.defaultValue || null,
      isRequired: formData.isRequired,
      isUnique: formData.isUnique,
      minVal: formData.minVal !== "" ? Number(formData.minVal) : null,
      maxVal: formData.maxVal !== "" ? Number(formData.maxVal) : null,
      regexPattern: formData.regexPattern || null,
      regexErrorMsg: formData.regexErrorMsg || null,
      optionsJson: parsedOptions ? JSON.stringify(parsedOptions) : null,
      dependentOnId: formData.dependentOnId || null,
      lookupTarget: formData.lookupTarget || null,
      sortOrder: Number(formData.sortOrder) || 0,
      showInList: formData.showInList,
      showInDetail: formData.showInDetail,
    };

    try {
      const url = editingField
        ? `/api/custom-fields/${editingField.id}`
        : `/api/custom-fields`;
      const method = editingField ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save field definition.");
      }

      setModalOpen(false);
      await fetchFields(selectedModule);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (field: FieldDefinitionDTO) => {
    try {
      await fetch(`/api/custom-fields/${field.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !field.isActive }),
      });
      await fetchFields(selectedModule);
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  // Delete / Soft Delete handler
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate field '${name}'? Existing record values will be preserved.`)) {
      return;
    }
    try {
      await fetch(`/api/custom-fields/${id}`, { method: "DELETE" });
      await fetchFields(selectedModule);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Seed sample starter custom fields
  const handleSeedDefaults = async () => {
    setLoading(true);
    const sampleSeeds: Record<string, any[]> = {
      PRODUCT: [
        { name: "fssai_license_no", label: "FSSAI License No", dataType: "TEXT", placeholder: "14-digit FSSAI Number", regexPattern: "^[0-9]{14}$", regexErrorMsg: "FSSAI must be 14 numeric digits", showInList: true, isRequired: false },
        { name: "is_cold_chain", label: "Cold Storage Required", dataType: "CHECKBOX", defaultValue: "false", showInList: true },
        { name: "shelf_life_days", label: "Shelf Life (Days)", dataType: "NUMBER", minVal: 1, maxVal: 730, placeholder: "e.g. 180", showInList: true },
        { name: "case_pack_tier", label: "Packaging Tier", dataType: "SELECT", optionsJson: JSON.stringify(["Standard Corrugated", "Polybag Wrapped", "Export Wooden Crate"]), showInList: true },
      ],
      CLIENT: [
        { name: "gst_state_code", label: "GST State Code", dataType: "TEXT", placeholder: "e.g. 27", regexPattern: "^[0-9]{2}$", regexErrorMsg: "Must be 2 digit state code", showInList: true },
        { name: "credit_limit_inr", label: "Approved Credit Limit", dataType: "CURRENCY", minVal: 0, defaultValue: "50000", showInList: true },
        { name: "store_front_gps", label: "Store Front GPS", dataType: "GEOLOCATION", showInList: true },
        { name: "outlet_grade", label: "Outlet Class Grade", dataType: "SELECT", optionsJson: JSON.stringify(["Class A (High Value)", "Class B (Mid Tier)", "Class C (Rural General)"]), showInList: true },
      ],
      ADDRESS: [
        { name: "delivery_route_code", label: "Delivery Route Code", dataType: "TEXT", placeholder: "e.g. RT-NORTH-04", showInList: true },
        { name: "landmark_details", label: "Key Landmark", dataType: "TEXT", placeholder: "Near Bus Terminal / Opp Petrol Pump", showInList: true },
      ],
      EMPLOYEE: [
        { name: "emergency_contact", label: "Emergency Phone", dataType: "PHONE", placeholder: "+91 99999 88888", showInList: true },
        { name: "territory_vehicle_no", label: "Vehicle Reg No", dataType: "TEXT", placeholder: "MH-02-AB-1234", showInList: true },
      ],
      SCHEME: [
        { name: "max_budget_cap", label: "Scheme Budget Cap", dataType: "CURRENCY", minVal: 1000, showInList: true },
        { name: "regional_priority", label: "Regional Priority Level", dataType: "SELECT", optionsJson: JSON.stringify(["Normal", "High Priority", "Festive Blitz"]), showInList: true },
      ],
    };

    const seeds = sampleSeeds[selectedModule] || [
      { name: "custom_reference_tag", label: "Custom Reference Tag", dataType: "TEXT", placeholder: "Enter tag", showInList: true },
    ];

    try {
      for (let i = 0; i < seeds.length; i++) {
        await fetch("/api/custom-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module: selectedModule,
            ...seeds[i],
            sortOrder: i + 1,
          }),
        });
      }
      await fetchFields(selectedModule);
    } catch (err) {
      console.error("Seed error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-md shadow-rose-500/20">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Dynamic Field Builder & Metadata Admin
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Configure dynamic columns, validations, dropdowns, and GPS fields across all master tables without code changes or schema downtime.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {fields.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Seed Recommended Fields
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Add Custom Field
          </button>
        </div>
      </div>

      {/* Module Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {MODULES.map((mod) => {
          const isActive = selectedModule === mod.key;
          return (
            <button
              key={mod.key}
              onClick={() => setSelectedModule(mod.key)}
              className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
                isActive
                  ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold tracking-tight truncate ${
                    isActive ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {mod.label.split(" ")[0]}
                </span>
                <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                  {mod.key}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
                {mod.label.replace(mod.label.split(" ")[0], "").trim()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fields List Table & Manager */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Active Custom Schema: {selectedModule} ({fields.length} Configured)
            </span>
          </div>

          <button
            onClick={() => fetchFields(selectedModule)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-rose-500" />
            Loading dynamic field metadata...
          </div>
        ) : fields.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No custom fields configured for {selectedModule}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add custom attributes such as compliance numbers, specialized tiers, coordinates, or dependent dropdowns without touching code.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={handleSeedDefaults}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
              >
                Seed Recommended Fields
              </button>
              <button
                onClick={handleOpenCreate}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
              >
                Create First Field
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Field Label & Key</th>
                  <th className="px-4 py-3">Data Type</th>
                  <th className="px-4 py-3">Validations</th>
                  <th className="px-4 py-3">Display Rules</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {fields.map((f, index) => (
                  <tr
                    key={f.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* Order */}
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      #{f.sortOrder || index + 1}
                    </td>

                    {/* Label & Key */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {f.label}
                      </div>
                      <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        customFields.{f.name}
                      </div>
                    </td>

                    {/* Data Type */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                        {f.dataType}
                      </span>
                    </td>

                    {/* Validations */}
                    <td className="px-4 py-3 space-y-1">
                      <div className="flex flex-wrap gap-1">
                        {f.isRequired ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300">
                            Required
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Optional
                          </span>
                        )}
                        {f.minVal !== null && f.minVal !== undefined && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            min:{f.minVal}
                          </span>
                        )}
                        {f.maxVal !== null && f.maxVal !== undefined && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            max:{f.maxVal}
                          </span>
                        )}
                        {f.regexPattern && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"
                            title={f.regexPattern}
                          >
                            Regex
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Display Rules */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <span
                          className={`flex items-center gap-1 ${
                            f.showInList ? "text-emerald-600 dark:text-emerald-400 font-medium" : "opacity-40"
                          }`}
                        >
                          <FileSpreadsheet className="w-3 h-3" /> List View
                        </span>
                        <span>•</span>
                        <span
                          className={`flex items-center gap-1 ${
                            f.showInDetail ? "text-indigo-600 dark:text-indigo-400 font-medium" : "opacity-40"
                          }`}
                        >
                          <Eye className="w-3 h-3" /> Detail Panel
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(f)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition ${
                          f.isActive
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {f.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" /> Inactive
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(f)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                          title="Edit Field"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(f.id, f.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Deactivate Field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Field Configuration Builder Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingField ? `Edit Field: ${editingField.label}` : `Add Custom Field to ${selectedModule}`}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400">
                  {errorMsg}
                </div>
              )}

              {/* Basic Details: Label & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Field Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.label}
                    placeholder="e.g. FSSAI License Number"
                    onChange={(e) => handleLabelChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-400">
                    User-facing label on forms & tables.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Machine Key (Slug) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingField)}
                    value={formData.name}
                    placeholder="e.g. fssai_license_number"
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value.toLowerCase().trim() })
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-400">
                    Immutable JSON key stored in database.
                  </p>
                </div>
              </div>

              {/* Data Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Field Data Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DATA_TYPES.map((dt) => {
                    const isSelected = formData.dataType === dt.type;
                    return (
                      <button
                        type="button"
                        key={dt.type}
                        onClick={() => setFormData({ ...formData, dataType: dt.type })}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span className="text-xs font-bold">{dt.label}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {dt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conditional Options: Select / Dependent Select */}
              {["SELECT", "DEPENDENT_SELECT"].includes(formData.dataType) && (
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                  <label className="block text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                    Dropdown Options (Comma separated)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.optionsText}
                    placeholder="Option 1, Option 2, Option 3"
                    onChange={(e) => setFormData({ ...formData, optionsText: e.target.value })}
                    className="w-full rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {formData.dataType === "DEPENDENT_SELECT" && (
                    <div>
                      <label className="block text-xs font-semibold text-indigo-950 dark:text-indigo-200 mb-1">
                        Parent Field (Dependent Source)
                      </label>
                      <select
                        value={formData.dependentOnId}
                        onChange={(e) => setFormData({ ...formData, dependentOnId: e.target.value })}
                        className="w-full rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                      >
                        <option value="">-- Choose Parent Field --</option>
                        {fields
                          .filter((f) => f.id !== editingField?.id && ["SELECT", "TEXT"].includes(f.dataType))
                          .map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label} ({f.name})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Number / Currency Bounds */}
              {["NUMBER", "CURRENCY"].includes(formData.dataType) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Minimum Value (Optional)
                    </label>
                    <input
                      type="number"
                      value={formData.minVal}
                      placeholder="e.g. 0"
                      onChange={(e) => setFormData({ ...formData, minVal: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Maximum Value (Optional)
                    </label>
                    <input
                      type="number"
                      value={formData.maxVal}
                      placeholder="e.g. 100000"
                      onChange={(e) => setFormData({ ...formData, maxVal: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Regex Validation Pattern (Text, Phone, Email) */}
              {["TEXT", "PHONE", "EMAIL"].includes(formData.dataType) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Regex Pattern (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.regexPattern}
                      placeholder="e.g. ^[0-9]{14}$"
                      onChange={(e) => setFormData({ ...formData, regexPattern: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Regex Error Message
                    </label>
                    <input
                      type="text"
                      value={formData.regexErrorMsg}
                      placeholder="e.g. Must be 14 numeric digits"
                      onChange={(e) => setFormData({ ...formData, regexErrorMsg: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* UI Layout & Requirement Flags */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRequired}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Mandatory
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showInList}
                    onChange={(e) => setFormData({ ...formData, showInList: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Show in Table
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showInDetail}
                    onChange={(e) => setFormData({ ...formData, showInDetail: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Detail View
                  </span>
                </label>

                <div className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Sort:
                  </span>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-12 text-center text-xs border rounded bg-transparent p-0.5"
                  />
                </div>
              </div>

              {/* Live Interactive Preview */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Live Preview in Forms:
                </span>
                <DynamicFormRenderer
                  fields={[
                    {
                      id: "preview-1",
                      module: selectedModule,
                      name: formData.name || "field_preview",
                      label: formData.label || "Preview Field",
                      dataType: formData.dataType,
                      placeholder: formData.placeholder,
                      defaultValue: formData.defaultValue,
                      isRequired: formData.isRequired,
                      minVal: formData.minVal !== "" ? Number(formData.minVal) : null,
                      maxVal: formData.maxVal !== "" ? Number(formData.maxVal) : null,
                      regexPattern: formData.regexPattern,
                      regexErrorMsg: formData.regexErrorMsg,
                      optionsJson: ["SELECT", "DEPENDENT_SELECT"].includes(formData.dataType)
                        ? JSON.stringify(formData.optionsText.split(",").map((s) => s.trim()))
                        : null,
                      sortOrder: 1,
                      isActive: true,
                      showInList: true,
                      showInDetail: true,
                    },
                  ]}
                  values={{}}
                  onChange={() => {}}
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving Definition..." : editingField ? "Update Field" : "Create Field"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
