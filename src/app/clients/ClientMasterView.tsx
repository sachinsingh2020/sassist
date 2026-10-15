"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Users,
  MapPin,
  Building2,
  ExternalLink,
  Shield,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  TrendingUp,
  CreditCard,
  Share2,
  Compass,
  Save,
  X,
  Eye,
  Edit2,
  Phone,
  Mail,
  RefreshCw,
} from "lucide-react";
import {
  createClient,
  updateClient,
  shareClient,
  revokeClientShare,
  reassignClientOwner,
  getClientById,
  checkClientDuplicate,
} from "@/actions/client";
import DynamicFormRenderer, {
  FieldDefinitionDTO,
} from "@/components/custom-fields/DynamicFormRenderer";
import {
  DynamicTableHeaders,
  DynamicTableRowCells,
} from "@/components/custom-fields/DynamicTableColumns";

interface ClientMasterViewProps {
  initialClients: any[];
  stats: {
    total: number;
    leads: number;
    prospects: number;
    customers: number;
    won: number;
  };
  addresses: any[];
  employees: any[];
  fieldDefinitions?: FieldDefinitionDTO[];
}

export default function ClientMasterView({
  initialClients,
  stats: initialStats,
  addresses,
  employees,
  fieldDefinitions = [],
}: ClientMasterViewProps) {
  const [clients, setClients] = useState(initialClients);
  const [stats, setStats] = useState(initialStats);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Sharing Modal
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<any | null>(null);
  const [shareEmployeeId, setShareEmployeeId] = useState("");
  const [shareAccessLevel, setShareAccessLevel] = useState("READ_WRITE");

  // Form State
  const [formState, setFormState] = useState({
    clientCode: "",
    businessName: "",
    contactName: "",
    phone: "",
    altPhone: "",
    email: "",
    clientType: "LEAD",
    stage: "NEW",
    status: "ACTIVE",
    addressId: "",
    ownerId: "",
    lat: "",
    lng: "",
    creditLimit: "50000",
    expectedVal: "100000",
    notes: "",
    transitionReason: "",
  });
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSaving, startSavingTransition] = useTransition();
  const [gpsLoading, setGpsLoading] = useState(false);

  // Filtered Client List
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        searchTerm === "" ||
        c.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.clientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchType = typeFilter === "ALL" || c.clientType === typeFilter;
      const matchStage = stageFilter === "ALL" || c.stage === stageFilter;
      const matchOwner = ownerFilter === "ALL" || c.ownerId === ownerFilter;

      return matchSearch && matchType && matchStage && matchOwner;
    });
  }, [clients, searchTerm, typeFilter, stageFilter, ownerFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingClient(null);
    setFormState({
      clientCode: `CL-${(clients.length + 101).toString()}`,
      businessName: "",
      contactName: "",
      phone: "",
      altPhone: "",
      email: "",
      clientType: "LEAD",
      stage: "NEW",
      status: "ACTIVE",
      addressId: addresses[0]?.id || "",
      ownerId: employees[0]?.id || "",
      lat: "",
      lng: "",
      creditLimit: "50000",
      expectedVal: "100000",
      notes: "",
      transitionReason: "Initial Registration",
    });
    setCustomFields({});
    setFormError(null);
    setDuplicateWarning(null);
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c: any) => {
    setEditingClient(c);
    setFormState({
      clientCode: c.clientCode,
      businessName: c.businessName,
      contactName: c.contactName,
      phone: c.phone,
      altPhone: c.altPhone || "",
      email: c.email || "",
      clientType: c.clientType,
      stage: c.stage,
      status: c.status,
      addressId: c.addressId || "",
      ownerId: c.ownerId || "",
      lat: c.lat !== null && c.lat !== undefined ? String(c.lat) : "",
      lng: c.lng !== null && c.lng !== undefined ? String(c.lng) : "",
      creditLimit: c.creditLimit !== null && c.creditLimit !== undefined ? String(c.creditLimit) : "0",
      expectedVal: c.expectedVal !== null && c.expectedVal !== undefined ? String(c.expectedVal) : "0",
      notes: c.notes || "",
      transitionReason: "",
    });
    setCustomFields(c.customFields || {});
    setFormError(null);
    setDuplicateWarning(null);
    setFormModalOpen(true);
  };

  // Real-time duplicate check
  const handleCheckDuplicate = async (name: string, phone: string, email: string) => {
    if (name.length > 3 || phone.length >= 8) {
      const dup = await checkClientDuplicate(name, phone, email, editingClient?.id);
      if (dup) {
        setDuplicateWarning(
          `Notice: An existing account with matching ${
            dup.phone === phone.trim() ? "Phone Number" : "Business Name"
          } already exists: '${dup.businessName}' (${dup.clientType}).`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  // Geotagging GPS Auto-Capture
  const handleCaptureGPS = () => {
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
        alert(`Failed to capture GPS: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  // Form Submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startSavingTransition(async () => {
      try {
        const payload = {
          ...formState,
          lat: formState.lat ? parseFloat(formState.lat) : null,
          lng: formState.lng ? parseFloat(formState.lng) : null,
          creditLimit: parseFloat(formState.creditLimit) || 0.0,
          expectedVal: parseFloat(formState.expectedVal) || 0.0,
          customFields,
        };

        if (editingClient) {
          const res = await updateClient(editingClient.id, payload);
          if (res.success && res.client) {
            setClients((prev) =>
              prev.map((c) => (c.id === editingClient.id ? { ...c, ...res.client } : c))
            );
            setFormModalOpen(false);
          }
        } else {
          const res = await createClient(payload);
          if (res.success && res.client) {
            setClients((prev) => [res.client, ...prev]);
            setStats((prev) => ({
              ...prev,
              total: prev.total + 1,
              leads: payload.clientType === "LEAD" ? prev.leads + 1 : prev.leads,
              prospects: payload.clientType === "PROSPECT" ? prev.prospects + 1 : prev.prospects,
              customers: payload.clientType === "CUSTOMER" ? prev.customers + 1 : prev.customers,
            }));
            setFormModalOpen(false);
          }
        }
      } catch (err: any) {
        setFormError(err.message || "Failed to save client.");
      }
    });
  };

  // Open Detail View with Lifecycle History
  const handleOpenDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const res = await getClientById(id);
      setSelectedDetail(res);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  // Submit Sharing
  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareTarget || !shareEmployeeId) return;
    try {
      await shareClient(shareTarget.id, shareEmployeeId, shareAccessLevel, "Admin");
      alert("Account successfully shared with employee!");
      setShareModalOpen(false);
    } catch (e: any) {
      alert("Error sharing client: " + e.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-md shadow-rose-500/20">
              <UserCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Client & Lead Master (CRM Accounts)
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            End-to-end account lifecycle (Lead → Prospect → Customer), Address Master links, geotagging, multi-employee ownership sharing, and duplicate detection.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Add Client / Lead
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Accounts</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">All CRM Entities</div>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs">
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">Leads</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {stats.leads.toLocaleString()}
          </div>
          <div className="text-[11px] text-blue-600/80 mt-1">Initial Inquiries</div>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">Prospects</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.prospects.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-600/80 mt-1">Qualified Pipeline</div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Customers
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.customers.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1 font-medium">
            Active Ordering Accounts
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Won / Onboarded</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.won.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Converted Accounts</div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by business name, contact person, client code, phone, or email..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Client Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          >
            <option value="ALL">All Account Types</option>
            <option value="LEAD">Leads</option>
            <option value="PROSPECT">Prospects</option>
            <option value="CUSTOMER">Customers</option>
          </select>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          >
            <option value="ALL">All Stages</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="PROPOSAL">Proposal</option>
            <option value="WON">Won / Closed</option>
            <option value="LOST">Lost</option>
          </select>

          {/* Owner Filter */}
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none max-w-[160px]"
          >
            <option value="ALL">All Owners</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>

          {(searchTerm || typeFilter !== "ALL" || stageFilter !== "ALL" || ownerFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("ALL");
                setStageFilter("ALL");
                setOwnerFilter("ALL");
              }}
              className="text-xs px-2.5 py-2 text-slate-500 hover:text-slate-800"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Clients Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Code & Business</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Contact & Phone</th>
                <th className="px-4 py-3">Associated Address</th>
                <th className="px-4 py-3">Owner & Shared Team</th>
                <th className="px-4 py-3">Geotag (GPS)</th>
                <DynamicTableHeaders fields={fieldDefinitions} />
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                >
                  {/* Code & Business Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                        {client.clientCode}
                      </span>
                      <div
                        onClick={() => handleOpenDetail(client.id)}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-rose-600 cursor-pointer"
                      >
                        {client.businessName}
                      </div>
                    </div>
                    {client.email && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{client.email}</div>
                    )}
                  </td>

                  {/* Client Type Badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {client.clientType === "CUSTOMER" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Customer
                      </span>
                    )}
                    {client.clientType === "PROSPECT" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        <TrendingUp className="w-3 h-3 text-amber-500" /> Prospect
                      </span>
                    )}
                    {client.clientType === "LEAD" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                        <Briefcase className="w-3 h-3 text-blue-500" /> Lead
                      </span>
                    )}
                  </td>

                  {/* Contact Person & Phone */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {client.contactName}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {client.phone}
                    </div>
                  </td>

                  {/* Associated Address */}
                  <td className="px-4 py-3 max-w-[200px]">
                    {client.address ? (
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {client.address.city}, {client.address.state}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate" title={client.address.addressLine1}>
                          {client.address.addressLine1} ({client.address.pincode})
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No Address Linked</span>
                    )}
                  </td>

                  {/* Owner & Shared Team */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {client.owner ? (
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px]">
                          {client.owner.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unassigned</span>
                      )}

                      {client.sharedWith && client.sharedWith.length > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-purple-100 text-purple-700"
                          title={`Shared with ${client.sharedWith.length} colleague(s)`}
                        >
                          +{client.sharedWith.length} Shared
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Geotagging (GPS) */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {client.lat && client.lng ? (
                      <a
                        href={`https://maps.google.com/?q=${client.lat},${client.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                        title="View Geotag on Google Maps"
                      >
                        <MapPin className="w-3 h-3 text-rose-500" />
                        {Number(client.lat).toFixed(4)}, {Number(client.lng).toFixed(4)}
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">—</span>
                    )}
                  </td>

                  {/* Dynamic Custom Columns */}
                  <DynamicTableRowCells
                    fields={fieldDefinitions}
                    customFields={client.customFields}
                  />

                  {/* Stage */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {client.stage}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenDetail(client.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                        title="View Full Profile & Lifecycle History"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(client)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                        title="Edit Account"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setShareTarget(client);
                          setShareEmployeeId(employees[0]?.id || "");
                          setShareModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                        title="Share with Colleague (Out of Hierarchy)"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredClients.length === 0 && (
                <tr>
                  <td
                    colSpan={8 + fieldDefinitions.length}
                    className="py-12 text-center text-slate-400 space-y-2"
                  >
                    <UserCheck className="w-8 h-8 mx-auto opacity-30" />
                    <p className="text-sm font-semibold">No clients or leads match criteria</p>
                    <p className="text-xs text-slate-500">
                      Adjust your filters or register a new business lead.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT CLIENT MODAL */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingClient ? `Edit Account: ${editingClient.businessName}` : "Register Client / Lead Account"}
                </h3>
              </div>
              <button
                onClick={() => setFormModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-600">
                  {formError}
                </div>
              )}

              {duplicateWarning && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>{duplicateWarning}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Client Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.clientCode}
                    onChange={(e) => setFormState({ ...formState, clientCode: e.target.value })}
                    className="w-full text-xs font-mono rounded border p-2 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Client Lifecycle Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formState.clientType}
                    onChange={(e) => setFormState({ ...formState, clientType: e.target.value })}
                    className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950 font-semibold text-rose-600"
                  >
                    <option value="LEAD">Lead (Initial Inbound / Field Visit)</option>
                    <option value="PROSPECT">Prospect (Qualified Interest)</option>
                    <option value="CUSTOMER">Customer (Confirmed Commercial Account)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">
                    Business / Enterprise Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.businessName}
                    placeholder="e.g. Reliance Smart Point / Metro Cash & Carry"
                    onChange={(e) => {
                      setFormState({ ...formState, businessName: e.target.value });
                      handleCheckDuplicate(e.target.value, formState.phone, formState.email);
                    }}
                    className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Contact Person Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.contactName}
                    placeholder="e.g. Suresh Patel"
                    onChange={(e) => setFormState({ ...formState, contactName: e.target.value })}
                    className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Primary Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formState.phone}
                    placeholder="+91 98200 44556"
                    onChange={(e) => {
                      setFormState({ ...formState, phone: e.target.value });
                      handleCheckDuplicate(formState.businessName, e.target.value, formState.email);
                    }}
                    className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formState.email}
                    placeholder="contact@enterprise.com"
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    value={formState.altPhone}
                    placeholder="+91 98200 99999"
                    onChange={(e) => setFormState({ ...formState, altPhone: e.target.value })}
                    className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>

                {/* Relational Link to Address Master */}
                <div className="sm:col-span-2 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20">
                  <label className="block text-xs font-semibold text-indigo-950 dark:text-indigo-200 mb-1">
                    Connect to Address Master (Physical Location)
                  </label>
                  <select
                    value={formState.addressId}
                    onChange={(e) => setFormState({ ...formState, addressId: e.target.value })}
                    className="w-full text-xs rounded border border-indigo-200 dark:border-indigo-800 p-2 bg-white dark:bg-slate-950"
                  >
                    <option value="">-- No Address Linked --</option>
                    {addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.addressLine1}, {addr.city} ({addr.pincode}) — {addr.territory || addr.state}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-indigo-600 mt-1">
                    Links to Address Master for delivery routes, territory beats, and supply chain tracking.
                  </p>
                </div>

                {/* Primary Owner from Employee Master */}
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Account Owner (Sales Rep / ASM)
                  </label>
                  <select
                    value={formState.ownerId}
                    onChange={(e) => setFormState({ ...formState, ownerId: e.target.value })}
                    className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950"
                  >
                    <option value="">-- Unassigned --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.empCode}) — {emp.designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Sales Stage</label>
                  <select
                    value={formState.stage}
                    onChange={(e) => setFormState({ ...formState, stage: e.target.value })}
                    className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950"
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="PROPOSAL">Proposal</option>
                    <option value="WON">Won / Customer</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>

                {/* Geotagging & GPS Auto-capture */}
                <div className="sm:col-span-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      Client Geotagging (Coordinates)
                    </span>
                    <button
                      type="button"
                      onClick={handleCaptureGPS}
                      disabled={gpsLoading}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-rose-500 hover:bg-rose-600 text-white shadow-xs disabled:opacity-50"
                    >
                      <Compass className={`w-3.5 h-3.5 ${gpsLoading ? "animate-spin" : ""}`} />
                      {gpsLoading ? "Capturing..." : "Auto-Capture GPS"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude (e.g. 19.0760)"
                      value={formState.lat}
                      onChange={(e) => setFormState({ ...formState, lat: e.target.value })}
                      className="w-full text-xs font-mono rounded border p-1.5 bg-white dark:bg-slate-950"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude (e.g. 72.8777)"
                      value={formState.lng}
                      onChange={(e) => setFormState({ ...formState, lng: e.target.value })}
                      className="w-full text-xs font-mono rounded border p-1.5 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Approved Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={formState.creditLimit}
                    onChange={(e) => setFormState({ ...formState, creditLimit: e.target.value })}
                    className="w-full text-xs font-mono rounded border p-2 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Expected Pipeline Value (₹)</label>
                  <input
                    type="number"
                    value={formState.expectedVal}
                    onChange={(e) => setFormState({ ...formState, expectedVal: e.target.value })}
                    className="w-full text-xs font-mono rounded border p-2 bg-white dark:bg-slate-950"
                  />
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

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Saving..." : editingClient ? "Update Account" : "Register Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM SHARING MODAL (OUT-OF-HIERARCHY) */}
      {shareModalOpen && shareTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-purple-600">
              <Share2 className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Share Account: {shareTarget.businessName}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Grant out-of-hierarchy visibility and update permissions to an authorized colleague.
            </p>

            <form onSubmit={handleShareSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Select Colleague</label>
                <select
                  required
                  value={shareEmployeeId}
                  onChange={(e) => setShareEmployeeId(e.target.value)}
                  className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees
                    .filter((emp) => emp.id !== shareTarget.ownerId)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.empCode}) — {emp.designation}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Permission Level</label>
                <select
                  value={shareAccessLevel}
                  onChange={(e) => setShareAccessLevel(e.target.value)}
                  className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950 font-semibold"
                >
                  <option value="READ_ONLY">Read Only (View Account & Orders)</option>
                  <option value="READ_WRITE">Read & Write (Create Orders, Log Visits)</option>
                  <option value="FULL">Full Access (Edit Account & Reassign)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShareModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Confirm Share
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL WITH LIFECYCLE & AUDIT HISTORY */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Client Lifecycle & Audit Trail
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {detailLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-rose-500" />
                  Loading client lifecycle records...
                </div>
              ) : selectedDetail ? (
                <>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-rose-600">
                        {selectedDetail.clientCode}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        {selectedDetail.clientType} ({selectedDetail.stage})
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {selectedDetail.businessName}
                    </div>
                    <div className="text-xs text-slate-500">
                      Contact: {selectedDetail.contactName} • Phone: {selectedDetail.phone}
                    </div>
                    {selectedDetail.address && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 pt-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        {selectedDetail.address.addressLine1}, {selectedDetail.address.city} (
                        {selectedDetail.address.pincode})
                      </div>
                    )}
                  </div>

                  {/* Lifecycle History (Lead -> Prospect -> Customer) */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      Client-Type Lifecycle Transitions ({selectedDetail.typeHistory?.length || 0})
                    </div>
                    <div className="space-y-2">
                      {selectedDetail.typeHistory && selectedDetail.typeHistory.length > 0 ? (
                        selectedDetail.typeHistory.map((th: any) => (
                          <div
                            key={th.id}
                            className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 text-xs flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                                {th.fromType} → {th.toType}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Reason: {th.triggerReason}
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {new Date(th.timestamp).toLocaleString("en-IN")}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 p-2">
                          No lifecycle transition records found.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Audit History Timeline */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                      <History className="w-4 h-4 text-rose-500" />
                      Audit & Field Change Timeline ({selectedDetail.auditHistory?.length || 0})
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
                              {item.reason || `Action by ${item.actorName}`}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 p-2">No audit logs available.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
