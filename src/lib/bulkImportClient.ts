import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface ColumnMapping {
  targetField: string;
  sourceHeader: string;
  label: string;
  required: boolean;
}

export interface DryRunValidationResult {
  totalRows: number;
  validCount: number;
  errorCount: number;
  previewRows: Record<string, any>[];
  rowErrors: { row: number; field: string; message: string }[];
  sanitizedRecords: Record<string, any>[];
}

/**
 * Standard Address target schema mapping candidates
 */
export const ADDRESS_FIELD_SPECS = [
  { field: "addressLine1", label: "Address Line 1", required: true, aliases: ["address line 1", "address 1", "addressline1", "address", "street", "street address", "line1"] },
  { field: "addressLine2", label: "Address Line 2", required: false, aliases: ["address line 2", "address 2", "addressline2", "line2", "suite", "apt", "floor"] },
  { field: "city", label: "City", required: true, aliases: ["city", "town", "municipality"] },
  { field: "state", label: "State", required: true, aliases: ["state", "province", "region"] },
  { field: "pincode", label: "Pincode / ZIP", required: true, aliases: ["pincode", "pin", "zip", "zipcode", "postal code", "postalcode"] },
  { field: "country", label: "Country", required: false, aliases: ["country", "nation"] },
  { field: "territory", label: "Territory", required: false, aliases: ["territory", "sales territory", "area"] },
  { field: "townLocality", label: "Town / Locality", required: false, aliases: ["town locality", "locality", "suburb", "neighborhood", "mohalla"] },
  { field: "district", label: "District", required: false, aliases: ["district", "zilla", "county"] },
  { field: "zone", label: "Zone", required: false, aliases: ["zone", "sales zone"] },
  { field: "route", label: "Route Code", required: false, aliases: ["route", "route code", "delivery route"] },
  { field: "beat", label: "Beat Code / Name", required: false, aliases: ["beat", "beat code", "beat name"] },
  { field: "lat", label: "Latitude", required: false, aliases: ["lat", "latitude"] },
  { field: "lng", label: "Longitude", required: false, aliases: ["lng", "longitude", "long"] },
];

/**
 * Automatically match CSV/Excel headers to known field targets
 */
export function autoMapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const spec of ADDRESS_FIELD_SPECS) {
    const matchedHeader = headers.find((h) => {
      const cleanH = h.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
      return spec.aliases.some((alias) => {
        const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
        return cleanH === cleanAlias || cleanH.includes(cleanAlias);
      });
    });

    if (matchedHeader) {
      mapping[spec.field] = matchedHeader;
    }
  }

  return mapping;
}

/**
 * Parse uploaded file (CSV or XLSX) into raw headers and JSON rows
 */
export async function parseFileToRows(
  file: File
): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        complete: (results) => {
          const headers = results.meta.fields || [];
          resolve({ headers, rows: results.data as Record<string, any>[] });
        },
        error: (err) => reject(new Error(err.message)),
      });
    });
  } else if (["xlsx", "xls"].includes(extension || "")) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { headers, rows };
  } else {
    throw new Error("Unsupported file format. Please upload a .csv or .xlsx file.");
  }
}

/**
 * Validate parsed rows against mapped fields and return dry-run analysis
 */
export function runDryRunValidation(
  rows: Record<string, any>[],
  mapping: Record<string, string>
): DryRunValidationResult {
  const rowErrors: { row: number; field: string; message: string }[] = [];
  const sanitizedRecords: Record<string, any>[] = [];
  const seenAddressKeys = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 1;
    let hasError = false;

    const record: Record<string, any> = {
      country: "India",
      status: "ACTIVE",
    };

    // Extract mapped values
    for (const spec of ADDRESS_FIELD_SPECS) {
      const sourceCol = mapping[spec.field];
      const rawVal = sourceCol ? row[sourceCol] : undefined;
      const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";

      if (spec.required && !strVal) {
        rowErrors.push({
          row: rowNum,
          field: spec.label,
          message: `${spec.label} is required and was empty.`,
        });
        hasError = true;
      }

      if (strVal) {
        record[spec.field] = strVal;
      }
    }

    // Pincode validation
    if (record.pincode) {
      const pinRegex = /^[1-9][0-9]{5}$/;
      if (!pinRegex.test(record.pincode)) {
        rowErrors.push({
          row: rowNum,
          field: "Pincode",
          message: `Invalid 6-digit postal code '${record.pincode}'.`,
        });
        hasError = true;
      }
    }

    // In-file duplicate check (same line 1 and pincode)
    if (record.addressLine1 && record.pincode) {
      const dupKey = `${record.addressLine1.toLowerCase()}|${record.pincode}`;
      if (seenAddressKeys.has(dupKey)) {
        rowErrors.push({
          row: rowNum,
          field: "Address Line 1",
          message: `Duplicate in uploaded file: same address line and pincode appears earlier.`,
        });
        hasError = true;
      } else {
        seenAddressKeys.add(dupKey);
      }
    }

    // Coordinates conversion
    if (record.lat) record.lat = parseFloat(record.lat) || null;
    if (record.lng) record.lng = parseFloat(record.lng) || null;

    if (!hasError) {
      sanitizedRecords.push(record);
    }
  });

  return {
    totalRows: rows.length,
    validCount: sanitizedRecords.length,
    errorCount: rows.length - sanitizedRecords.length,
    previewRows: rows.slice(0, 5),
    rowErrors,
    sanitizedRecords,
  };
}
