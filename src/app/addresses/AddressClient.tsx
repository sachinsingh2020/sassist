"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Edit2,
  Trash2,
  ExternalLink,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Compass,
  FileSpreadsheet,
  X,
  Check,
  Save,
  RefreshCw,
} from "lucide-react";
import {
  INDIA_GEO_DATA,
  getStates,
  getCities,
  getTerritories,
  getDistrict,
} from "@/lib/geoData";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  getAddressById,
  checkAddressDuplicate,
  bulkInsertAddresses,
} from "@/actions/address";
import DynamicFormRenderer, {
  FieldDefinitionDTO,
} from "@/components/custom-fields/DynamicFormRenderer";
import {
  DynamicTableHeaders,
  DynamicTableRowCells,
} from "@/components/custom-fields/DynamicTableColumns";
import {
  parseFileToRows,
  autoMapHeaders,
  runDryRunValidation,
  ADDRESS_FIELD_SPECS,
  DryRunValidationResult,
} from "@/lib/bulkImportClient";

interface AddressClientProps {
  initialAddresses: any[];
  stats: {
    total: number;
    active: number;
    uniqueCities: number;
    uniquePincodes: number;
  };
  fieldDefinitions?: FieldDefinitionDTO[];
}

export default function AddressClient({
  initialAddresses,
  stats: initialStats,
  fieldDefinitions = [],
}: AddressClientProps) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [stats, setStats] = useState(initialStats);
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal States
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Bulk Import Modal States
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [uploadedHeaders, setUploadedHeaders] = useState<string[]>([]);
  const [uploadedRows, setUploadedRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [dryRunResult, setDryRunResult] = useState<DryRunValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<any | null>(null);

  // Form input states
  const [formState, setFormState] = useState({
    addressLine1: "",
    addressLine2: "",
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
    district: "Mumbai Suburban",
    zone: "West",
    territory: "Andheri West",
    townLocality: "",
    pincode: "400053",
    route: "",
    beat: "",
    deliveryArea: "",
    lat: "",
    lng: "",
    status: "ACTIVE",
  });
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSaving, startSavingTransition] = useTransition();
  const [gpsLoading, setGpsLoading] = useState(false);

  // Available geographical dependent options
  const statesList = useMemo(() => getStates(), []);
  const availableCities = useMemo(() => getCities(formState.state), [formState.state]);
  const availableTerritories = useMemo(
    () => getTerritories(formState.state, formState.city),
    [formState.state, formState.city]
  );

  // Filtered Addresses for Table
  const filteredAddresses = useMemo(() => {
    return addresses.filter((addr) => {
      const matchSearch =
        searchTerm === "" ||
        addr.addressLine1.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (addr.addressLine2 && addr.addressLine2.toLowerCase().includes(searchTerm.toLowerCase())) ||
        addr.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        addr.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        addr.pincode.includes(searchTerm) ||
        (addr.territory && addr.territory.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (addr.route && addr.route.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchState = stateFilter === "ALL" || addr.state === stateFilter;
      const matchCity = cityFilter === "ALL" || addr.city === cityFilter;
      const matchStatus = statusFilter === "ALL" || addr.status === statusFilter;

      return matchSearch && matchState && matchCity && matchStatus;
    });
  }, [addresses, searchTerm, stateFilter, cityFilter, statusFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAddress(null);
    setFormState({
      addressLine1: "",
      addressLine2: "",
      country: "India",
      state: "Maharashtra",
      city: "Mumbai",
      district: "Mumbai Suburban",
      zone: "West",
      territory: "Andheri West",
      townLocality: "",
      pincode: "400053",
      route: "",
      beat: "",
      deliveryArea: "",
      lat: "",
      lng: "",
      status: "ACTIVE",
    });
    setCustomFields({});
    setFormError(null);
    setDuplicateWarning(null);
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (addr: any) => {
    setEditingAddress(addr);
    setFormState({
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || "",
      country: addr.country || "India",
      state: addr.state,
      city: addr.city,
      district: addr.district || "",
      zone: addr.zone || "",
      territory: addr.territory || "",
      townLocality: addr.townLocality || "",
      pincode: addr.pincode,
      route: addr.route || "",
      beat: addr.beat || "",
      deliveryArea: addr.deliveryArea || "",
      lat: addr.lat !== null && addr.lat !== undefined ? String(addr.lat) : "",
      lng: addr.lng !== null && addr.lng !== undefined ? String(addr.lng) : "",
      status: addr.status || "ACTIVE",
    });
    setCustomFields(addr.customFields || {});
    setFormError(null);
    setDuplicateWarning(null);
    setFormModalOpen(true);
  };

  // Open Detail View with Audit Log History
  const handleOpenDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const detailed = await getAddressById(id);
      setSelectedDetail(detailed);
    } catch (e) {
      console.error("Failed to load address detail:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  // Real-time Duplicate Check
  const checkDuplicateAsync = async (line1: string, pin: string, city: string) => {
    if (line1.length > 5 && pin.length === 6) {
      const dup = await checkAddressDuplicate(line1, pin, city, editingAddress?.id);
      if (dup) {
        setDuplicateWarning(
          `Notice: An address with matching Line 1 and PIN code already exists in ${dup.city} (ID: ${dup.id.slice(0, 8)}).`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  // GPS auto-capture for form
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        setFormState((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
      },
      (err) => {
        setGpsLoading(false);
        alert(`Failed to detect location: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  // Form Save
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startSavingTransition(async () => {
      try {
        const payload = {
          ...formState,
          lat: formState.lat ? parseFloat(formState.lat) : null,
          lng: formState.lng ? parseFloat(formState.lng) : null,
          customFields,
        };

        if (editingAddress) {
          const res = await updateAddress(editingAddress.id, payload);
          if (res.success && res.address) {
            setAddresses((prev) =>
              prev.map((a) => (a.id === editingAddress.id ? res.address : a))
            );
            setFormModalOpen(false);
          }
        } else {
          const res = await createAddress(payload);
          if (res.success && res.address) {
            setAddresses((prev) => [res.address, ...prev]);
            setStats((prev) => ({
              ...prev,
              total: prev.total + 1,
              active: prev.active + 1,
            }));
            setFormModalOpen(false);
          }
        }
      } catch (err: any) {
        setFormError(err.message || "Failed to save address.");
      }
    });
  };

  // Deactivate or Delete Address
  const handleDeleteAddress = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to deactivate address '${name}'? Existing relationships will be preserved.`
      )
    ) {
      return;
    }

    try {
      await deleteAddress(id, false);
      setAddresses((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "INACTIVE" } : a))
      );
      setStats((prev) => ({ ...prev, active: Math.max(0, prev.active - 1) }));
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredAddresses.length === 0) return;
    const headers = [
      "ID",
      "Address Line 1",
      "Address Line 2",
      "Town/Locality",
      "City",
      "District",
      "State",
      "Pincode",
      "Country",
      "Territory",
      "Zone",
      "Route",
      "Beat",
      "Latitude",
      "Longitude",
      "Status",
    ];

    const rows = filteredAddresses.map((a) => [
      a.id,
      `"${(a.addressLine1 || "").replace(/"/g, '""')}"`,
      `"${(a.addressLine2 || "").replace(/"/g, '""')}"`,
      `"${(a.townLocality || "").replace(/"/g, '""')}"`,
      a.city,
      a.district || "",
      a.state,
      a.pincode,
      a.country || "India",
      a.territory || "",
      a.zone || "",
      a.route || "",
      a.beat || "",
      a.lat || "",
      a.lng || "",
      a.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `address_master_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk Import: Handle File Selection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { headers, rows } = await parseFileToRows(file);
      setUploadedHeaders(headers);
      setUploadedRows(rows);

      // Auto-map headers
      const autoMapping = autoMapHeaders(headers);
      setColumnMapping(autoMapping);

      // Run initial dry run validation
      const dryRun = runDryRunValidation(rows, autoMapping);
      setDryRunResult(dryRun);
      setImportStep(2);
    } catch (err: any) {
      alert("Failed to parse file: " + err.message);
    }
  };

  // Bulk Import: Execute Import
  const handleExecuteBulkImport = async () => {
    if (!dryRunResult || dryRunResult.sanitizedRecords.length === 0) return;
    setImporting(true);
    setImportReport(null);

    try {
      const res = await bulkInsertAddresses(dryRunResult.sanitizedRecords as any);
      setImportReport(res);
      setImportStep(3);

      // Refresh list
      if (res.totalInserted > 0) {
        window.location.reload();
      }
    } catch (err: any) {
      alert("Bulk import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-md shadow-rose-500/20">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Address & Geographical Master
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Hierarchical location master (Country → State → City → Territory → Town/Locality → Pincode) with GPS coordinates, duplicate detection, and Excel/CSV bulk import.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>

          <button
            onClick={() => {
              setImportStep(1);
              setImportReport(null);
              setImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition shadow-xs"
          >
            <Upload className="w-4 h-4 text-indigo-500" />
            Bulk Import (Excel/CSV)
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Registered Addresses</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            Master Records
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Active Operational</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.active.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified Locations</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Cities / Towns Covered</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.uniqueCities.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Municipal Hubs</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Unique Pincodes (Postal)</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {stats.uniquePincodes.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Postal Delivery Zones</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by address line, city, pincode, territory, or route..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* State Filter */}
          <select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setCityFilter("ALL");
            }}
            className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          >
            <option value="ALL">All States</option>
            {statesList.map((s) => (
              <option key={s.code} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          >
            <option value="ALL">All Cities</option>
            {getCities(stateFilter !== "ALL" ? stateFilter : "Maharashtra").map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {(searchTerm || stateFilter !== "ALL" || cityFilter !== "ALL" || statusFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStateFilter("ALL");
                setCityFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="text-xs px-2.5 py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Address Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Address & Locality</th>
                <th className="px-4 py-3">City / District</th>
                <th className="px-4 py-3">State & PIN</th>
                <th className="px-4 py-3">Territory & Zone</th>
                <th className="px-4 py-3">Route / Beat</th>
                <th className="px-4 py-3">GPS Coordinates</th>
                <DynamicTableHeaders fields={fieldDefinitions} />
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredAddresses.map((addr) => (
                <tr
                  key={addr.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                >
                  {/* Address Line & Locality */}
                  <td className="px-4 py-3 max-w-[220px]">
                    <div
                      onClick={() => handleOpenDetail(addr.id)}
                      className="font-semibold text-slate-900 dark:text-slate-100 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer truncate"
                      title={addr.addressLine1}
                    >
                      {addr.addressLine1}
                    </div>
                    {addr.addressLine2 && (
                      <div className="text-[11px] text-slate-500 truncate" title={addr.addressLine2}>
                        {addr.addressLine2}
                      </div>
                    )}
                    {addr.townLocality && (
                      <span className="inline-block mt-0.5 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                        {addr.townLocality}
                      </span>
                    )}
                  </td>

                  {/* City & District */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{addr.city}</div>
                    <div className="text-[11px] text-slate-400">{addr.district || "—"}</div>
                  </td>

                  {/* State & Pincode */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-slate-800 dark:text-slate-200">{addr.state}</div>
                    <span className="inline-block font-mono font-bold text-[11px] text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {addr.pincode}
                    </span>
                  </td>

                  {/* Territory & Zone */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-slate-700 dark:text-slate-300 font-medium">
                      {addr.territory || "—"}
                    </div>
                    {addr.zone && (
                      <span className="text-[10px] text-slate-400">{addr.zone} Zone</span>
                    )}
                  </td>

                  {/* Route / Beat */}
                  <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                    {addr.route ? (
                      <div className="font-mono text-slate-700 dark:text-slate-300">
                        Route: {addr.route}
                      </div>
                    ) : (
                      <div className="text-slate-400">—</div>
                    )}
                    {addr.beat && (
                      <div className="text-slate-500 text-[10px]">Beat: {addr.beat}</div>
                    )}
                  </td>

                  {/* GPS Coordinates */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {addr.lat && addr.lng ? (
                      <a
                        href={`https://maps.google.com/?q=${addr.lat},${addr.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition"
                        title="Open in Google Maps"
                      >
                        <MapPin className="w-3 h-3 text-rose-500" />
                        {Number(addr.lat).toFixed(4)}, {Number(addr.lng).toFixed(4)}
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-mono">—</span>
                    )}
                  </td>

                  {/* Dynamic Custom Fields */}
                  <DynamicTableRowCells
                    fields={fieldDefinitions}
                    customFields={addr.customFields}
                  />

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        addr.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {addr.status === "ACTIVE" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-slate-400" /> Inactive
                        </>
                      )}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenDetail(addr.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="View Record Details & History"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(addr)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                        title="Edit Address"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id, addr.addressLine1)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Deactivate Address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredAddresses.length === 0 && (
                <tr>
                  <td
                    colSpan={8 + fieldDefinitions.length}
                    className="py-12 text-center text-slate-400 space-y-2"
                  >
                    <Building2 className="w-8 h-8 mx-auto opacity-30" />
                    <p className="text-sm font-semibold">No addresses found</p>
                    <p className="text-xs text-slate-500">
                      Try adjusting your search criteria or register a new location.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT ADDRESS MODAL */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingAddress ? "Edit Address Record" : "Add New Geographical Address"}
                </h3>
              </div>
              <button
                onClick={() => setFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400">
                  {formError}
                </div>
              )}

              {duplicateWarning && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              {/* Geographic Hierarchy Selectors (Dependent Cascading) */}
              <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                  <Compass className="w-3.5 h-3.5 text-indigo-500" />
                  Hierarchical Geographic Selection
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* State */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formState.state}
                      onChange={(e) => {
                        const newState = e.target.value;
                        const cities = getCities(newState);
                        const firstCity = cities[0]?.name || "";
                        const terrs = getTerritories(newState, firstCity);
                        const dist = getDistrict(newState, firstCity) || "";
                        const samplePin = cities[0]?.samplePincodes[0] || "";
                        setFormState((prev) => ({
                          ...prev,
                          state: newState,
                          city: firstCity,
                          territory: terrs[0] || "",
                          district: dist,
                          pincode: samplePin || prev.pincode,
                        }));
                        checkDuplicateAsync(formState.addressLine1, samplePin || formState.pincode, firstCity);
                      }}
                      className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2"
                    >
                      {statesList.map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.name} ({s.zone})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={formState.city}
                      onChange={(e) => {
                        const newCity = e.target.value;
                        const terrs = getTerritories(formState.state, newCity);
                        const dist = getDistrict(formState.state, newCity) || "";
                        const cityObj = availableCities.find((c) => c.name === newCity);
                        const samplePin = cityObj?.samplePincodes[0] || formState.pincode;
                        setFormState((prev) => ({
                          ...prev,
                          city: newCity,
                          district: dist,
                          territory: terrs[0] || "",
                          pincode: samplePin,
                        }));
                        checkDuplicateAsync(formState.addressLine1, samplePin, newCity);
                      }}
                      className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2"
                    >
                      {availableCities.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Territory */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Territory
                    </label>
                    <select
                      value={formState.territory}
                      onChange={(e) => setFormState({ ...formState, territory: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2"
                    >
                      <option value="">-- Choose Territory --</option>
                      {availableTerritories.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Address Lines & Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Address Line 1 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.addressLine1}
                    placeholder="Shop/Building No, Premise Name, Street"
                    onChange={(e) => {
                      setFormState({ ...formState, addressLine1: e.target.value });
                      checkDuplicateAsync(e.target.value, formState.pincode, formState.city);
                    }}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={formState.addressLine2}
                    placeholder="Floor, Wing, Industrial Estate"
                    onChange={(e) => setFormState({ ...formState, addressLine2: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Town / Locality / Suburb
                  </label>
                  <input
                    type="text"
                    value={formState.townLocality}
                    placeholder="e.g. Lokhandwala Complex"
                    onChange={(e) => setFormState({ ...formState, townLocality: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pincode (6 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={formState.pincode}
                    placeholder="e.g. 400053"
                    onChange={(e) => {
                      setFormState({ ...formState, pincode: e.target.value });
                      checkDuplicateAsync(formState.addressLine1, e.target.value, formState.city);
                    }}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Route Code / Beat
                  </label>
                  <input
                    type="text"
                    value={formState.route}
                    placeholder="e.g. RT-ANDHERI-02"
                    onChange={(e) => setFormState({ ...formState, route: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>
              </div>

              {/* Geotagging & GPS Auto-capture */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    Geotagging & Coordinates
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={gpsLoading}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-rose-500 hover:bg-rose-600 text-white shadow-xs transition disabled:opacity-50"
                  >
                    <Compass className={`w-3.5 h-3.5 ${gpsLoading ? "animate-spin" : ""}`} />
                    {gpsLoading ? "Capturing..." : "Auto-Capture GPS"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formState.lat}
                      placeholder="e.g. 19.1363"
                      onChange={(e) => setFormState({ ...formState, lat: e.target.value })}
                      className="w-full text-xs font-mono rounded border p-1.5 bg-white dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formState.lng}
                      placeholder="e.g. 72.8276"
                      onChange={(e) => setFormState({ ...formState, lng: e.target.value })}
                      className="w-full text-xs font-mono rounded border p-1.5 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Custom Fields */}
              {fieldDefinitions.length > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <DynamicFormRenderer
                    fields={fieldDefinitions}
                    values={customFields}
                    onChange={(k, v) => setCustomFields((prev) => ({ ...prev, [k]: v }))}
                  />
                </div>
              )}

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : editingAddress ? "Update Address" : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD DETAIL & AUDIT HISTORY MODAL */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Address Record Details
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {detailLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-rose-500" />
                  Loading record & history...
                </div>
              ) : selectedDetail ? (
                <>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {selectedDetail.addressLine1}
                    </div>
                    {selectedDetail.addressLine2 && (
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {selectedDetail.addressLine2}
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      {selectedDetail.townLocality && `${selectedDetail.townLocality}, `}
                      {selectedDetail.city}, {selectedDetail.state} — {selectedDetail.pincode}
                    </div>
                    {selectedDetail.lat && selectedDetail.lng && (
                      <div className="pt-2 flex items-center gap-2">
                        <a
                          href={`https://maps.google.com/?q=${selectedDetail.lat},${selectedDetail.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-lg bg-rose-50 text-rose-600 border border-rose-200"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          {selectedDetail.lat}, {selectedDetail.lng}
                          <ExternalLink className="w-3 h-3 ml-1 opacity-60" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Audit History Timeline */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      <History className="w-4 h-4 text-rose-500" />
                      Audit & Change History ({selectedDetail.auditHistory?.length || 0})
                    </div>

                    <div className="space-y-2">
                      {selectedDetail.auditHistory && selectedDetail.auditHistory.length > 0 ? (
                        selectedDetail.auditHistory.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-rose-600 uppercase text-[10px]">
                                {item.action}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(item.timestamp).toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 text-[11px]">
                              {item.reason || `Action performed by ${item.actorName}`}
                            </div>
                            <div className="text-[10px] text-slate-500">By: {item.actorEmail}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-slate-950/40 rounded-lg">
                          No prior change history logged for this record.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL (EXCEL / CSV) */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Bulk Import Addresses (Excel / CSV)
                </h3>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Step Indicators */}
              <div className="flex items-center justify-center gap-3 text-xs font-semibold">
                <span
                  className={`px-3 py-1 rounded-full ${
                    importStep === 1
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                  }`}
                >
                  1. Upload File
                </span>
                <span className="text-slate-300">→</span>
                <span
                  className={`px-3 py-1 rounded-full ${
                    importStep === 2
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                  }`}
                >
                  2. Map & Dry Run
                </span>
                <span className="text-slate-300">→</span>
                <span
                  className={`px-3 py-1 rounded-full ${
                    importStep === 3
                      ? "bg-rose-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                  }`}
                >
                  3. Execution Report
                </span>
              </div>

              {/* STEP 1: Upload File */}
              {importStep === 1 && (
                <div className="space-y-4">
                  <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center space-y-3 hover:border-indigo-500 transition">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-indigo-500" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Choose a CSV or Excel file (.csv, .xlsx, .xls)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Supports bulk rows with automated column matching and dry-run error prevention.
                      </p>
                    </div>
                    <label className="inline-block cursor-pointer px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm">
                      Select File
                      <input
                        type="file"
                        accept=".csv, .xlsx, .xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 2: Field Mapping & Dry Run Validation */}
              {importStep === 2 && dryRunResult && (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center">
                      <div className="text-[11px] text-slate-500">Total Rows Detected</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {dryRunResult.totalRows}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-center">
                      <div className="text-[11px] text-emerald-600">Valid & Ready</div>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {dryRunResult.validCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-center">
                      <div className="text-[11px] text-rose-600">Errors Flagged</div>
                      <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        {dryRunResult.errorCount}
                      </div>
                    </div>
                  </div>

                  {/* Row-by-Row Error Breakdown */}
                  {dryRunResult.rowErrors.length > 0 && (
                    <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 max-h-40 overflow-y-auto space-y-1">
                      <div className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
                        Validation Errors (These rows will be skipped):
                      </div>
                      {dryRunResult.rowErrors.map((err, idx) => (
                        <div key={idx} className="text-[11px] text-rose-600 flex items-center gap-2">
                          <span className="font-mono font-bold">Row #{err.row}:</span>
                          <span>{err.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Column Auto-Mapping Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 text-xs font-bold uppercase tracking-wider text-slate-600 border-b">
                      Confirmed Column Mapping
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 text-xs">
                      {ADDRESS_FIELD_SPECS.map((spec) => (
                        <div key={spec.field} className="flex items-center justify-between py-1.5 px-2">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {spec.label} {spec.required && <span className="text-rose-500">*</span>}
                          </span>
                          <select
                            value={columnMapping[spec.field] || ""}
                            onChange={(e) => {
                              const newMap = { ...columnMapping, [spec.field]: e.target.value };
                              setColumnMapping(newMap);
                              setDryRunResult(runDryRunValidation(uploadedRows, newMap));
                            }}
                            className="text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 max-w-[180px]"
                          >
                            <option value="">-- Ignore --</option>
                            {uploadedHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => setImportStep(1)}
                      className="px-3 py-1.5 text-xs font-semibold rounded border"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleExecuteBulkImport}
                      disabled={importing || dryRunResult.validCount === 0}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs disabled:opacity-50"
                    >
                      {importing
                        ? "Importing Records..."
                        : `Import ${dryRunResult.validCount} Valid Addresses`}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Execution Report */}
              {importStep === 3 && importReport && (
                <div className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Import Batch Processed Successfully
                  </h4>
                  <p className="text-xs text-slate-500">
                    Successfully imported {importReport.totalInserted} addresses out of{" "}
                    {importReport.totalAttempted} attempted.
                  </p>
                  <button
                    onClick={() => {
                      setImportModalOpen(false);
                      window.location.reload();
                    }}
                    className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white"
                  >
                    Done & Refresh Master
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
