"use client";

import { useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  Building2,
  Users,
  UserCheck,
  Target,
  Tag,
  ArrowRight,
  RefreshCw,
  Eye,
  FileText,
  Clock,
  History,
} from "lucide-react";
import { ModuleName } from "@prisma/client";
import {
  parseFileToRows,
  autoMapHeaders,
  runDryRunValidation,
  autoMapProductHeaders,
  runProductDryRunValidation,
  autoMapSchemeHeaders,
  runSchemeDryRunValidation,
  autoMapClientHeaders,
  runClientDryRunValidation,
  autoMapEmployeeHeaders,
  runEmployeeDryRunValidation,
  autoMapTargetHeaders,
  runTargetDryRunValidation,
  downloadSampleTemplate,
  ADDRESS_FIELD_SPECS,
  PRODUCT_FIELD_SPECS,
  SCHEME_FIELD_SPECS,
  CLIENT_FIELD_SPECS,
  EMPLOYEE_FIELD_SPECS,
  TARGET_FIELD_SPECS,
  DryRunValidationResult,
} from "@/lib/bulkImportClient";
import { executeUniversalBulkImport, fetchBulkImportHistory } from "@/actions/bulkImport";

interface ImportsClientProps {
  initialHistory: any[];
  initialStats: any;
}

export default function ImportsClient({
  initialHistory,
  initialStats,
}: ImportsClientProps) {
  const [activeTab, setActiveTab] = useState<"IMPORT" | "HISTORY">("IMPORT");
  const [selectedModule, setSelectedModule] = useState<ModuleName>("PRODUCT");
  const [file, setFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationResult, setValidationResult] = useState<DryRunValidationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResponse, setImportResponse] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>(initialHistory);
  const [selectedJobErrors, setSelectedJobErrors] = useState<any | null>(null);

  const modulesConfig: {
    id: ModuleName;
    label: string;
    description: string;
    icon: any;
    fieldSpecs: any[];
  }[] = [
    {
      id: "PRODUCT",
      label: "Products Catalog",
      description: "SKU, MRP, Commercial Tiers, Brands, Packaging",
      icon: Package,
      fieldSpecs: PRODUCT_FIELD_SPECS,
    },
    {
      id: "ADDRESS",
      label: "Address Master",
      description: "Geographic Hierarchy, Pincodes, Lat/Lng Coordinates",
      icon: Building2,
      fieldSpecs: ADDRESS_FIELD_SPECS,
    },
    {
      id: "CLIENT",
      label: "Clients & Leads",
      description: "Business Names, Contacts, Phones, Pipeline Stages",
      icon: UserCheck,
      fieldSpecs: CLIENT_FIELD_SPECS,
    },
    {
      id: "EMPLOYEE",
      label: "Employee Master",
      description: "Staff ID, Hierarchy, Designations, Territories",
      icon: Users,
      fieldSpecs: EMPLOYEE_FIELD_SPECS,
    },
    {
      id: "TARGET",
      label: "Target Quotas",
      description: "Sales Value, Volume Targets, Quarterly Quotas",
      icon: Target,
      fieldSpecs: TARGET_FIELD_SPECS,
    },
    {
      id: "SCHEME",
      label: "Trade Schemes",
      description: "Discounts, Slab Tiers, Promos, Validity Calendars",
      icon: Tag,
      fieldSpecs: SCHEME_FIELD_SPECS,
    },
  ];

  const currentModuleConfig = modulesConfig.find((m) => m.id === selectedModule)!;

  // Handle Module Change
  const handleSelectModule = (mod: ModuleName) => {
    setSelectedModule(mod);
    setFile(null);
    setParsedHeaders([]);
    setParsedRows([]);
    setColumnMapping({});
    setValidationResult(null);
    setImportResponse(null);
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setValidationResult(null);
    setImportResponse(null);
    setIsProcessing(true);

    try {
      const { headers, rows } = await parseFileToRows(uploadedFile);
      setParsedHeaders(headers);
      setParsedRows(rows);

      // Auto Map
      let mapping: Record<string, string> = {};
      switch (selectedModule) {
        case "PRODUCT":
          mapping = autoMapProductHeaders(headers);
          break;
        case "ADDRESS":
          mapping = autoMapHeaders(headers);
          break;
        case "CLIENT":
          mapping = autoMapClientHeaders(headers);
          break;
        case "EMPLOYEE":
          mapping = autoMapEmployeeHeaders(headers);
          break;
        case "TARGET":
          mapping = autoMapTargetHeaders(headers);
          break;
        case "SCHEME":
          mapping = autoMapSchemeHeaders(headers);
          break;
      }
      setColumnMapping(mapping);
    } catch (err: any) {
      alert("Error reading file: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Dry Run Validation
  const handleRunValidation = () => {
    if (!parsedRows.length) return;

    let res: DryRunValidationResult;
    switch (selectedModule) {
      case "PRODUCT":
        res = runProductDryRunValidation(parsedRows, columnMapping);
        break;
      case "ADDRESS":
        res = runDryRunValidation(parsedRows, columnMapping);
        break;
      case "CLIENT":
        res = runClientDryRunValidation(parsedRows, columnMapping);
        break;
      case "EMPLOYEE":
        res = runEmployeeDryRunValidation(parsedRows, columnMapping);
        break;
      case "TARGET":
        res = runTargetDryRunValidation(parsedRows, columnMapping);
        break;
      case "SCHEME":
        res = runSchemeDryRunValidation(parsedRows, columnMapping);
        break;
      default:
        res = runDryRunValidation(parsedRows, columnMapping);
    }
    setValidationResult(res);
  };

  // Handle Final Universal Import
  const handleConfirmImport = async () => {
    if (!validationResult || !validationResult.sanitizedRecords.length) {
      alert("No valid records to import.");
      return;
    }

    setIsImporting(true);
    try {
      const res = await executeUniversalBulkImport(
        selectedModule,
        file?.name || "import.csv",
        validationResult.sanitizedRecords,
        file?.name.endsWith(".xlsx") ? "XLSX" : "CSV"
      );

      setImportResponse(res);
      // Refresh history
      const historyRes = await fetchBulkImportHistory();
      if (historyRes.success) setHistory(historyRes.data);
    } catch (err: any) {
      alert("Bulk import failed: " + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <UploadCloud className="h-7 w-7 text-indigo-400" />
            Universal Bulk Data Importer & Migration Hub
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Seamlessly import, validate, and synchronize records across Products, Addresses, Clients, Employees, Targets, and Schemes.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("IMPORT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "IMPORT"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UploadCloud className="h-4 w-4" />
            Import Wizard
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "HISTORY"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="h-4 w-4" />
            Import History ({history.length})
          </button>
        </div>
      </div>

      {activeTab === "IMPORT" ? (
        <div className="space-y-6">
          {/* Step 1: Select Master Module */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Step 1: Select Master Module to Import
              </h2>
              <button
                onClick={() => downloadSampleTemplate(selectedModule)}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold bg-indigo-950/40 border border-indigo-800/60 px-3 py-1.5 rounded-lg transition"
              >
                <Download className="h-3.5 w-3.5" />
                Download Sample CSV Template ({selectedModule})
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {modulesConfig.map((mod) => {
                const Icon = mod.icon;
                const isSelected = selectedModule === mod.id;

                return (
                  <button
                    key={mod.id}
                    onClick={() => handleSelectModule(mod.id)}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
                      isSelected
                        ? "bg-indigo-600/10 border-indigo-500 shadow-md shadow-indigo-950/50"
                        : "bg-slate-900/60 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg mb-2 ${
                        isSelected ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="font-bold text-xs text-white">{mod.label}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {mod.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: File Upload Box */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Step 2: Upload CSV or Excel (.xlsx)
            </h2>

            <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-900/40 rounded-2xl p-8 text-center transition flex flex-col items-center justify-center">
              <input
                type="file"
                id="bulk-file-input"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="bulk-file-input"
                className="cursor-pointer flex flex-col items-center space-y-3"
              >
                <div className="p-4 rounded-full bg-slate-800 text-indigo-400">
                  <FileSpreadsheet className="h-8 w-8" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">
                    {file ? file.name : "Click to select or drop CSV/Excel file here"}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {file
                      ? `${(file.size / 1024).toFixed(1)} KB • ${parsedRows.length} rows detected`
                      : "Supports standard CSV and Excel formats with automatic header detection"}
                  </div>
                </div>
                <div className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg">
                  {file ? "Choose Another File" : "Browse Files"}
                </div>
              </label>
            </div>
          </div>

          {/* Step 3: Column Mapping & Dry-Run Validation */}
          {parsedHeaders.length > 0 && (
            <div className="space-y-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-indigo-400" />
                    Step 3: Column Mapping & Validation
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Match your spreadsheet columns with {selectedModule} fields. Required fields marked with *.
                  </p>
                </div>
                <button
                  onClick={handleRunValidation}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-indigo-900/30"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Run Dry-Run Analysis
                </button>
              </div>

              {/* Column Mapping Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentModuleConfig.fieldSpecs.map((spec) => (
                  <div
                    key={spec.field}
                    className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">
                        {spec.label} {spec.required && <span className="text-rose-400">*</span>}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">{spec.field}</span>
                    </div>

                    <select
                      value={columnMapping[spec.field] || ""}
                      onChange={(e) =>
                        setColumnMapping({ ...columnMapping, [spec.field]: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Ignore Field --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>
                          Column: {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Validation Results & Final Import Trigger */}
          {validationResult && (
            <div className="space-y-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Dry-Run Validation Analysis Results
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verified {validationResult.totalRows} records against strict FMCG schema rules.
                  </p>
                </div>

                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting || validationResult.validCount === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                >
                  {isImporting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  Import {validationResult.validCount} Verified Records Now
                </button>
              </div>

              {/* Stats Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs text-slate-400 font-medium">Total Rows</div>
                  <div className="text-xl font-bold text-white mt-1">
                    {validationResult.totalRows}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/20 text-center">
                  <div className="text-xs text-emerald-400 font-medium">Valid & Ready</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {validationResult.validCount}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-rose-500/20 text-center">
                  <div className="text-xs text-rose-400 font-medium">Errors Detected</div>
                  <div className="text-xl font-bold text-rose-400 mt-1">
                    {validationResult.errorCount}
                  </div>
                </div>
              </div>

              {/* Error Log if errors exist */}
              {validationResult.rowErrors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Validation Errors ({validationResult.rowErrors.length})
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-slate-950 rounded-xl border border-rose-500/30 p-2 divide-y divide-slate-800/60 text-xs">
                    {validationResult.rowErrors.map((err, idx) => (
                      <div key={idx} className="py-1.5 px-2 flex items-center justify-between">
                        <span className="font-semibold text-slate-300">
                          Row {err.row} • [{err.field}]
                        </span>
                        <span className="text-rose-400 font-mono text-[11px]">{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-indigo-400" />
                  Sanitized Preview (First 5 Records)
                </div>
                <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        {Object.keys(validationResult.sanitizedRecords[0] || {}).map((k) => (
                          <th key={k} className="p-2.5 font-semibold text-[11px]">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {validationResult.sanitizedRecords.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          {Object.values(row).map((val: any, cIdx) => (
                            <td key={cIdx} className="p-2.5 font-mono text-[11px]">
                              {String(val ?? "-")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Import Success / Execution Result Banner */}
          {importResponse && (
            <div
              className={`p-5 rounded-2xl border ${
                importResponse.success
                  ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-200"
                  : "bg-rose-950/30 border-rose-500/50 text-rose-200"
              }`}
            >
              <div className="flex items-center gap-3">
                {importResponse.success ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-rose-400" />
                )}
                <div>
                  <div className="font-bold text-sm text-white">{importResponse.message}</div>
                  <div className="text-xs opacity-80 mt-0.5">
                    Job ID: {importResponse.importJobId} • Successfully saved to PostgreSQL database
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Historical Imports Audit Log */
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" />
              Universal Bulk Import History & Audit Records
            </h2>
            <div className="text-xs text-slate-400">{history.length} completed jobs</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Success</th>
                  <th className="py-3 px-4">Failures</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No bulk import jobs recorded yet.
                    </td>
                  </tr>
                ) : (
                  history.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {new Date(job.createdAt).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-[10px] font-bold">
                          {job.module}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-medium text-white truncate max-w-xs">
                        {job.fileName}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-200">{job.totalRecords}</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">{job.successCount}</td>
                      <td className="py-3 px-4 font-bold text-rose-400">{job.failureCount}</td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            job.status === "COMPLETED"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : job.status === "PARTIAL"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {job.errorReportJson && Array.isArray(job.errorReportJson) && job.errorReportJson.length > 0 ? (
                          <button
                            onClick={() => setSelectedJobErrors(job.errorReportJson)}
                            className="text-xs text-rose-400 hover:text-rose-300 underline font-medium"
                          >
                            View Errors
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Clean</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: View Job Errors */}
      {selectedJobErrors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Import Error Report
              </h2>
              <button
                onClick={() => setSelectedJobErrors(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {selectedJobErrors.map((err: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1"
                >
                  <div className="font-semibold text-slate-200">Row {err.row}</div>
                  <div className="text-rose-400 font-mono text-[11px]">{err.error}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedJobErrors(null)}
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
