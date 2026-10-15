"use client";

import React from "react";
import { FieldDefinitionDTO } from "./DynamicFormRenderer";
import { MapPin, Check, X } from "lucide-react";

interface DynamicTableHeadersProps {
  fields: FieldDefinitionDTO[];
}

export function DynamicTableHeaders({ fields }: DynamicTableHeadersProps) {
  const visibleFields = fields
    .filter((f) => f.isActive && f.showInList)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (visibleFields.length === 0) return null;

  return (
    <>
      {visibleFields.map((field) => (
        <th
          key={field.id}
          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-slate-100/60 dark:bg-slate-800/60 whitespace-nowrap"
        >
          {field.label}
        </th>
      ))}
    </>
  );
}

interface DynamicTableRowCellsProps {
  fields: FieldDefinitionDTO[];
  customFields?: Record<string, any> | null;
}

export function DynamicTableRowCells({
  fields,
  customFields = {},
}: DynamicTableRowCellsProps) {
  const visibleFields = fields
    .filter((f) => f.isActive && f.showInList)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (visibleFields.length === 0) return null;

  const data = customFields || {};

  return (
    <>
      {visibleFields.map((field) => {
        const val = data[field.name];

        if (val === undefined || val === null || val === "") {
          return (
            <td
              key={field.id}
              className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 font-mono"
            >
              —
            </td>
          );
        }

        if (field.dataType === "CURRENCY") {
          return (
            <td
              key={field.id}
              className="px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap"
            >
              ₹{Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </td>
          );
        }

        if (field.dataType === "CHECKBOX") {
          return (
            <td key={field.id} className="px-4 py-3 text-xs">
              {val ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Check className="w-3 h-3" /> Yes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <X className="w-3 h-3" /> No
                </span>
              )}
            </td>
          );
        }

        if (field.dataType === "GEOLOCATION" && typeof val === "object" && val?.lat) {
          return (
            <td key={field.id} className="px-4 py-3 text-xs whitespace-nowrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                <MapPin className="w-3 h-3 text-rose-500" />
                {val.lat.toFixed(4)}, {val.lng.toFixed(4)}
              </span>
            </td>
          );
        }

        return (
          <td
            key={field.id}
            className="px-4 py-3 text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[200px] truncate"
            title={String(val)}
          >
            {String(val)}
          </td>
        );
      })}
    </>
  );
}
