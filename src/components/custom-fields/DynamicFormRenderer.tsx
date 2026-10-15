"use client";

import React, { useState } from "react";
import {
  MapPin,
  Calendar,
  Hash,
  Type,
  DollarSign,
  CheckSquare,
  ListFilter,
  Mail,
  Phone,
  Search,
  AlertCircle,
  Compass,
} from "lucide-react";

export interface FieldDefinitionDTO {
  id: string;
  module: string;
  name: string;
  label: string;
  dataType: string;
  placeholder?: string | null;
  defaultValue?: string | null;
  isRequired: boolean;
  isUnique?: boolean;
  minVal?: number | null;
  maxVal?: number | null;
  regexPattern?: string | null;
  regexErrorMsg?: string | null;
  optionsJson?: string | null;
  dependentOnId?: string | null;
  lookupTarget?: string | null;
  sortOrder: number;
  isActive: boolean;
  showInList: boolean;
  showInDetail: boolean;
}

interface DynamicFormRendererProps {
  fields: FieldDefinitionDTO[];
  values: Record<string, any>;
  errors?: Record<string, string>;
  onChange: (name: string, value: any) => void;
  disabled?: boolean;
}

export default function DynamicFormRenderer({
  fields,
  values,
  errors = {},
  onChange,
  disabled = false,
}: DynamicFormRendererProps) {
  const [gpsLoading, setGpsLoading] = useState<string | null>(null);

  if (!fields || fields.length === 0) {
    return null;
  }

  // Parse dropdown options helper
  const parseOptions = (optionsJson: string | null | undefined, parentVal?: any) => {
    if (!optionsJson) return [];
    try {
      const parsed = JSON.parse(optionsJson);
      if (!Array.isArray(parsed)) return [];

      // Check if it's dependent options format: { label, value, parentValue }
      if (parentVal) {
        return parsed.filter((opt) => {
          if (typeof opt === "string") return true;
          return !opt.parentValue || opt.parentValue === parentVal;
        });
      }

      return parsed.map((opt) =>
        typeof opt === "string" ? { label: opt, value: opt } : opt
      );
    } catch {
      return [];
    }
  };

  const handleDetectGPS = (fieldName: string) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser/device.");
      return;
    }
    setGpsLoading(fieldName);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(null);
        onChange(fieldName, {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: new Date().toISOString(),
        });
      },
      (err) => {
        setGpsLoading(null);
        alert(`Failed to capture GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <ListFilter className="w-4 h-4 text-rose-500" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Configurable Custom Fields
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields
          .filter((f) => f.isActive)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((field) => {
            const val = values[field.name] ?? field.defaultValue ?? "";
            const err = errors[field.name];

            // Parent value if this field is dependent
            const parentField = field.dependentOnId
              ? fields.find((f) => f.id === field.dependentOnId)
              : null;
            const parentVal = parentField ? values[parentField.name] : undefined;
            const options = parseOptions(field.optionsJson, parentVal);

            return (
              <div
                key={field.id}
                className={`flex flex-col gap-1.5 ${
                  field.dataType === "GEOLOCATION" ? "sm:col-span-2" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    {field.label}
                    {field.isRequired && (
                      <span className="text-rose-500 font-bold">*</span>
                    )}
                  </label>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                    {field.dataType.toLowerCase()}
                  </span>
                </div>

                {/* TEXT INPUT */}
                {field.dataType === "TEXT" && (
                  <div className="relative">
                    <input
                      type="text"
                      disabled={disabled}
                      value={val}
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      onChange={(e) => onChange(field.name, e.target.value)}
                      className={`w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                        err
                          ? "border-rose-500 focus:ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 focus:ring-rose-500/40"
                      }`}
                    />
                  </div>
                )}

                {/* NUMBER INPUT */}
                {field.dataType === "NUMBER" && (
                  <div className="relative">
                    <input
                      type="number"
                      disabled={disabled}
                      value={val}
                      min={field.minVal ?? undefined}
                      max={field.maxVal ?? undefined}
                      placeholder={field.placeholder || "0"}
                      onChange={(e) =>
                        onChange(
                          field.name,
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      className={`w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                        err
                          ? "border-rose-500 focus:ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 focus:ring-rose-500/40"
                      }`}
                    />
                  </div>
                )}

                {/* CURRENCY INPUT */}
                {field.dataType === "CURRENCY" && (
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-semibold text-slate-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      disabled={disabled}
                      value={val}
                      min={field.minVal ?? 0}
                      max={field.maxVal ?? undefined}
                      placeholder={field.placeholder || "0.00"}
                      onChange={(e) =>
                        onChange(
                          field.name,
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      className={`w-full pl-7 rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                        err
                          ? "border-rose-500 focus:ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 focus:ring-rose-500/40"
                      }`}
                    />
                  </div>
                )}

                {/* DATE INPUT */}
                {field.dataType === "DATE" && (
                  <div className="relative">
                    <input
                      type="date"
                      disabled={disabled}
                      value={val}
                      onChange={(e) => onChange(field.name, e.target.value)}
                      className={`w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition ${
                        err
                          ? "border-rose-500 focus:ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 focus:ring-rose-500/40"
                      }`}
                    />
                  </div>
                )}

                {/* CHECKBOX / TOGGLE */}
                {field.dataType === "CHECKBOX" && (
                  <label className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={Boolean(val)}
                      onChange={(e) => onChange(field.name, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {field.placeholder || `Enable ${field.label}`}
                    </span>
                  </label>
                )}

                {/* SELECT DROPDOWN */}
                {field.dataType === "SELECT" && (
                  <select
                    disabled={disabled}
                    value={val}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    className={`w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition ${
                      err
                        ? "border-rose-500 focus:ring-rose-400"
                        : "border-slate-300 dark:border-slate-700 focus:ring-rose-500/40"
                    }`}
                  >
                    <option value="">-- Select {field.label} --</option>
                    {options.map((opt: any, idx: number) => (
                      <option key={idx} value={opt.value ?? opt.label ?? opt}>
                        {opt.label ?? opt.value ?? opt}
                      </option>
                    ))}
                  </select>
                )}

                {/* DEPENDENT SELECT */}
                {field.dataType === "DEPENDENT_SELECT" && (
                  <div className="space-y-1">
                    <select
                      disabled={Boolean(disabled || (parentField && !parentVal))}
                      value={val}
                      onChange={(e) => onChange(field.name, e.target.value)}
                      className={`w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 transition ${
                        err
                          ? "border-rose-500 focus:ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 focus:ring-rose-500/40"
                      }`}
                    >
                      <option value="">
                        {parentField && !parentVal
                          ? `Select ${parentField.label} first`
                          : `-- Select ${field.label} --`}
                      </option>
                      {options.map((opt: any, idx: number) => (
                        <option key={idx} value={opt.value ?? opt.label ?? opt}>
                          {opt.label ?? opt.value ?? opt}
                        </option>
                      ))}
                    </select>
                    {parentField && (
                      <p className="text-[10px] text-slate-600 dark:text-slate-400">
                        Dependent on: {parentField.label}
                      </p>
                    )}
                  </div>
                )}

                {/* EMAIL INPUT */}
                {field.dataType === "EMAIL" && (
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      disabled={disabled}
                      value={val}
                      placeholder={field.placeholder || "example@domain.com"}
                      onChange={(e) => onChange(field.name, e.target.value)}
                      className={`w-full pl-9 rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                        err
                          ? "border-rose-500 focus:ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 focus:ring-rose-500/40"
                      }`}
                    />
                  </div>
                )}

                {/* PHONE INPUT */}
                {field.dataType === "PHONE" && (
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      disabled={disabled}
                      value={val}
                      placeholder={field.placeholder || "+91 98765 43210"}
                      onChange={(e) => onChange(field.name, e.target.value)}
                      className={`w-full pl-9 rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                        err
                          ? "border-rose-500 focus:ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 focus:ring-rose-500/40"
                      }`}
                    />
                  </div>
                )}

                {/* GEOLOCATION INPUT */}
                {field.dataType === "GEOLOCATION" && (
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <span>Coordinates:</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {typeof val === "object" && val?.lat
                            ? `${val.lat}, ${val.lng} (±${val.accuracy || 10}m)`
                            : "Not Captured"}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={disabled || gpsLoading === field.name}
                        onClick={() => handleDetectGPS(field.name)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-rose-500 hover:bg-rose-600 text-white shadow-sm transition disabled:opacity-50"
                      >
                        <Compass
                          className={`w-3.5 h-3.5 ${
                            gpsLoading === field.name ? "animate-spin" : ""
                          }`}
                        />
                        {gpsLoading === field.name ? "Locating..." : "Auto-Capture GPS"}
                      </button>
                    </div>
                  </div>
                )}

                {/* LOOKUP INPUT */}
                {field.dataType === "LOOKUP" && (
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      disabled={disabled}
                      value={val}
                      placeholder={field.placeholder || `Lookup ${field.lookupTarget || field.label}...`}
                      onChange={(e) => onChange(field.name, e.target.value)}
                      className={`w-full pl-9 rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 transition ${
                        err
                          ? "border-rose-500 focus:ring-rose-400"
                          : "border-slate-300 dark:border-slate-700 focus:ring-rose-500/40"
                      }`}
                    />
                  </div>
                )}

                {/* Under-field Error Message */}
                {err && (
                  <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {err}
                  </p>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
