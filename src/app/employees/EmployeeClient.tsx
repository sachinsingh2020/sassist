"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  UserCheck,
  UserX,
  Shield,
  Clock,
  History,
  GitBranch,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Briefcase,
  MapPin,
  Save,
  X,
  Phone,
  Mail,
  UserPlus,
  RefreshCw,
  Eye,
  Edit2,
} from "lucide-react";
import {
  createEmployee,
  updateEmployee,
  markPositionVacant,
  occupyVacantPosition,
  createDelegatedAccess,
  revokeDelegatedAccess,
  getEmployeeById,
} from "@/actions/employee";
import DynamicFormRenderer, {
  FieldDefinitionDTO,
} from "@/components/custom-fields/DynamicFormRenderer";
import {
  DynamicTableHeaders,
  DynamicTableRowCells,
} from "@/components/custom-fields/DynamicTableColumns";

interface EmployeeClientProps {
  initialEmployees: any[];
  stats: {
    total: number;
    active: number;
    onLeave: number;
    vacant: number;
    departments: number;
  };
  fieldDefinitions?: FieldDefinitionDTO[];
}

export default function EmployeeClient({
  initialEmployees,
  stats: initialStats,
  fieldDefinitions = [],
}: EmployeeClientProps) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [stats, setStats] = useState(initialStats);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"TABLE" | "HIERARCHY">("TABLE");

  // Modal States
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Vacancy / Replacement Modal
  const [vacantModalOpen, setVacantModalOpen] = useState(false);
  const [vacantTarget, setVacantTarget] = useState<any | null>(null);
  const [occupyModalOpen, setOccupyModalOpen] = useState(false);
  const [occupyTarget, setOccupyTarget] = useState<any | null>(null);
  const [replacementForm, setReplacementForm] = useState({
    empCode: "",
    name: "",
    email: "",
    phone: "",
    reassignDirectReports: true,
  });

  // Delegated Access Modal
  const [delegateModalOpen, setDelegateModalOpen] = useState(false);
  const [delegateTarget, setDelegateTarget] = useState<any | null>(null);
  const [delegateForm, setDelegateForm] = useState({
    toEmployeeId: "",
    effectiveEnd: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    scope: "ALL",
    reason: "Vacation / Field Transfer Coverage",
  });

  // Employee Form State
  const [formState, setFormState] = useState({
    empCode: "",
    name: "",
    email: "",
    phone: "",
    designation: "Area Sales Manager",
    department: "Field Sales",
    status: "ACTIVE",
    territoryName: "",
    managerId: "",
  });
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, startSavingTransition] = useTransition();

  // Filtered list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        searchTerm === "" ||
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.empCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.territoryName && emp.territoryName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchDept = departmentFilter === "ALL" || emp.department === departmentFilter;
      const matchStatus = statusFilter === "ALL" || emp.status === statusFilter;

      return matchSearch && matchDept && matchStatus;
    });
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingEmployee(null);
    setFormState({
      empCode: `EMP-${(employees.length + 101).toString()}`,
      name: "",
      email: "",
      phone: "",
      designation: "Sales Representative",
      department: "Field Sales",
      status: "ACTIVE",
      territoryName: "Mumbai Central",
      managerId: employees[0]?.id || "",
    });
    setCustomFields({});
    setFormError(null);
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: any) => {
    setEditingEmployee(emp);
    setFormState({
      empCode: emp.empCode,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      designation: emp.designation,
      department: emp.department,
      status: emp.status,
      territoryName: emp.territoryName || "",
      managerId: emp.managerId || "",
    });
    setCustomFields(emp.customFields || {});
    setFormError(null);
    setFormModalOpen(true);
  };

  // Open Detail View with Audit Log
  const handleOpenDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const res = await getEmployeeById(id);
      setSelectedDetail(res);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  // Save Form Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    startSavingTransition(async () => {
      try {
        const payload = {
          ...formState,
          managerId: formState.managerId || null,
          customFields,
        };

        if (editingEmployee) {
          const res = await updateEmployee(editingEmployee.id, payload);
          if (res.success && res.employee) {
            setEmployees((prev) =>
              prev.map((e) => (e.id === editingEmployee.id ? { ...e, ...res.employee } : e))
            );
            setFormModalOpen(false);
          }
        } else {
          const res = await createEmployee(payload);
          if (res.success && res.employee) {
            setEmployees((prev) => [res.employee, ...prev]);
            setStats((prev) => ({ ...prev, total: prev.total + 1, active: prev.active + 1 }));
            setFormModalOpen(false);
          }
        }
      } catch (err: any) {
        setFormError(err.message || "Failed to save employee.");
      }
    });
  };

  // Mark Position Vacant Handler
  const handleConfirmVacant = async (reason: string) => {
    if (!vacantTarget) return;
    try {
      const res = await markPositionVacant(vacantTarget.id, reason);
      if (res.success) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === vacantTarget.id ? { ...e, status: "VACANT" } : e))
        );
        setStats((prev) => ({
          ...prev,
          active: Math.max(0, prev.active - 1),
          vacant: prev.vacant + 1,
        }));
        setVacantModalOpen(false);
      }
    } catch (e: any) {
      alert("Error marking vacant: " + e.message);
    }
  };

  // Occupy Vacant Position Handler
  const handleConfirmOccupy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!occupyTarget) return;
    try {
      const res = await occupyVacantPosition(occupyTarget.id, replacementForm);
      if (res.success && res.employee) {
        setEmployees((prev) => [
          res.employee,
          ...prev.map((e) => (e.id === occupyTarget.id ? { ...e, status: "INACTIVE" } : e)),
        ]);
        setStats((prev) => ({
          ...prev,
          vacant: Math.max(0, prev.vacant - 1),
          active: prev.active + 1,
        }));
        setOccupyModalOpen(false);
      }
    } catch (e: any) {
      alert("Error occupying position: " + e.message);
    }
  };

  // Delegated Access Submit
  const handleDelegateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateTarget || !delegateForm.toEmployeeId) return;
    try {
      await createDelegatedAccess({
        fromEmployeeId: delegateTarget.id,
        toEmployeeId: delegateForm.toEmployeeId,
        effectiveEnd: delegateForm.effectiveEnd,
        scope: delegateForm.scope,
        reason: delegateForm.reason,
      });
      alert("Delegated access granted successfully!");
      setDelegateModalOpen(false);
    } catch (e: any) {
      alert("Error granting delegation: " + e.message);
    }
  };

  // Hierarchy Tree Builder Helper
  const hierarchyTree = useMemo(() => {
    const map = new Map<string, any>();
    employees.forEach((emp) => {
      map.set(emp.id, { ...emp, children: [] });
    });

    const roots: any[] = [];
    map.forEach((emp) => {
      if (emp.managerId && map.has(emp.managerId)) {
        map.get(emp.managerId).children.push(emp);
      } else {
        roots.push(emp);
      }
    });

    return roots;
  }, [employees]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white shadow-md shadow-rose-500/20">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Employee Master & Reporting Hierarchy
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage organizational hierarchy, parent-child reporting lines with circular loop prevention, vacant position handovers, and temporary delegated permissions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-950">
            <button
              onClick={() => setViewMode("TABLE")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                viewMode === "TABLE"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Directory List
            </button>
            <button
              onClick={() => setViewMode("HIERARCHY")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                viewMode === "HIERARCHY"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
              Hierarchy Tree
            </button>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Register Employee
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Headcount</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across All Departments</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Active Field Force</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.active.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            Operational Reps & ASMs
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            Vacant Positions
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.vacant.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
            Ready for Replacement
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">On Leave / Delegated</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.onLeave.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Delegated Workflows Active</div>
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
            placeholder="Search by name, employee code, designation, territory..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            <option value="Field Sales">Field Sales</option>
            <option value="Key Accounts">Key Accounts</option>
            <option value="Trade Marketing">Trade Marketing</option>
            <option value="Logistics & Supply">Logistics & Supply</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="VACANT">Vacant Position</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {(searchTerm || departmentFilter !== "ALL" || statusFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setDepartmentFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="text-xs px-2.5 py-2 text-slate-500 hover:text-slate-800"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: DIRECTORY TABLE */}
      {viewMode === "TABLE" ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Code & Name</th>
                  <th className="px-4 py-3">Designation & Dept</th>
                  <th className="px-4 py-3">Reporting Manager</th>
                  <th className="px-4 py-3">Direct Reports</th>
                  <th className="px-4 py-3">Territory</th>
                  <DynamicTableHeaders fields={fieldDefinitions} />
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* Code & Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
                          {emp.empCode}
                        </span>
                        <div
                          onClick={() => handleOpenDetail(emp.id)}
                          className="font-semibold text-slate-900 dark:text-slate-100 hover:text-rose-600 cursor-pointer"
                        >
                          {emp.name}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{emp.email}</div>
                    </td>

                    {/* Designation & Dept */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {emp.designation}
                      </div>
                      <div className="text-[11px] text-slate-500">{emp.department}</div>
                    </td>

                    {/* Reporting Manager */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {emp.manager ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
                          <span className="font-semibold">{emp.manager.name}</span>
                          <span className="text-[10px] opacity-70 font-mono">
                            ({emp.manager.empCode})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">
                          Executive Level (Top)
                        </span>
                      )}
                    </td>

                    {/* Direct Reports Count */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {emp.directReports && emp.directReports.length > 0 ? (
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3 text-slate-500" />
                          {emp.directReports.length} Reports
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Individual Contributor</span>
                      )}
                    </td>

                    {/* Territory */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {emp.territoryName ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {emp.territoryName}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Dynamic Custom Columns */}
                    <DynamicTableRowCells
                      fields={fieldDefinitions}
                      customFields={emp.customFields}
                    />

                    {/* Status Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {emp.status === "ACTIVE" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Active
                        </span>
                      )}
                      {emp.status === "VACANT" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-amber-500" /> Vacant Position
                        </span>
                      )}
                      {emp.status === "ON_LEAVE" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                          <Clock className="w-3 h-3 text-blue-500" /> On Leave
                        </span>
                      )}
                      {emp.status === "INACTIVE" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          <XCircle className="w-3 h-3 text-slate-400" /> Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(emp.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="View Profile & Audit Trail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                          title="Edit Employee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* If Vacant, offer Occupy action */}
                        {emp.status === "VACANT" ? (
                          <button
                            onClick={() => {
                              setOccupyTarget(emp);
                              setReplacementForm({
                                empCode: `EMP-${(employees.length + 101).toString()}`,
                                name: "",
                                email: "",
                                phone: "",
                                reassignDirectReports: true,
                              });
                              setOccupyModalOpen(true);
                            }}
                            className="px-2 py-1 text-[10px] font-bold rounded-md bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                            title="Occupy Vacant Position"
                          >
                            Occupy
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setVacantTarget(emp);
                              setVacantModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                            title="Mark Position as Vacant"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delegate Access */}
                        <button
                          onClick={() => {
                            setDelegateTarget(emp);
                            setDelegateModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                          title="Grant Temporary Delegated Access"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW 2: VISUAL REPORTING HIERARCHY TREE */
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Reporting Hierarchy Tree (Top-Down Organization)
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Interactive parent-child structure preventing circular reporting loops
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {hierarchyTree.map((rootNode) => (
              <HierarchyNodeItem key={rootNode.id} node={rootNode} onSelect={handleOpenDetail} />
            ))}
          </div>
        </div>
      )}

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {editingEmployee ? `Edit Employee: ${editingEmployee.name}` : "Register New Employee"}
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
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Employee Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.empCode}
                    onChange={(e) => setFormState({ ...formState, empCode: e.target.value })}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    placeholder="e.g. Ramesh Kulkarni"
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formState.email}
                    placeholder="employee@domain.com"
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formState.phone}
                    placeholder="+91 98765 43210"
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Designation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.designation}
                    placeholder="Area Sales Manager"
                    onChange={(e) => setFormState({ ...formState, designation: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={formState.department}
                    onChange={(e) => setFormState({ ...formState, department: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2"
                  >
                    <option value="Field Sales">Field Sales</option>
                    <option value="Key Accounts">Key Accounts</option>
                    <option value="Trade Marketing">Trade Marketing</option>
                    <option value="Logistics & Supply">Logistics & Supply</option>
                  </select>
                </div>

                {/* Reporting Manager (With Cycle Prevention) */}
                <div className="sm:col-span-2 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20">
                  <label className="block text-xs font-semibold text-indigo-950 dark:text-indigo-200 mb-1">
                    Reporting Manager (Hierarchy Head)
                  </label>
                  <select
                    value={formState.managerId}
                    onChange={(e) => setFormState({ ...formState, managerId: e.target.value })}
                    className="w-full text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 p-2"
                  >
                    <option value="">-- No Manager (Top Level Executive) --</option>
                    {employees
                      .filter((e) => e.id !== editingEmployee?.id)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.empCode}) — {e.designation}
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">
                    Protected by cycle detection: self-reporting or circular reporting (A → B → A) is strictly blocked.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Territory
                  </label>
                  <input
                    type="text"
                    value={formState.territoryName}
                    placeholder="e.g. Mumbai Central"
                    onChange={(e) => setFormState({ ...formState, territoryName: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="VACANT">Vacant Position</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
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
                  {isSaving ? "Saving..." : editingEmployee ? "Update Employee" : "Register Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARK POSITION VACANT MODAL */}
      {vacantModalOpen && vacantTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Mark Position as Vacant
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              You are marking the position for{" "}
              <strong className="text-slate-900 dark:text-slate-100">{vacantTarget.name}</strong> (
              {vacantTarget.designation}) as <strong>VACANT</strong>.
            </p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <div>✓ Historical transactions and audit records are preserved.</div>
              <div>
                ✓ Direct reports ({vacantTarget.directReports?.length || 0}) remain attached until a
                replacement is assigned.
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setVacantModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmVacant("Employee departed / transferred position")}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
              >
                Confirm Vacancy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCCUPY VACANT POSITION MODAL */}
      {occupyModalOpen && occupyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-emerald-600">
              <UserPlus className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Occupy Vacant Position: {occupyTarget.designation}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Assign an authorized replacement employee to take over this vacancy.
            </p>

            <form onSubmit={handleConfirmOccupy} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">New Employee Code</label>
                <input
                  type="text"
                  required
                  value={replacementForm.empCode}
                  onChange={(e) =>
                    setReplacementForm({ ...replacementForm, empCode: e.target.value })
                  }
                  className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Replacement Employee Name</label>
                <input
                  type="text"
                  required
                  value={replacementForm.name}
                  placeholder="e.g. Vikram Singhal"
                  onChange={(e) =>
                    setReplacementForm({ ...replacementForm, name: e.target.value })
                  }
                  className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={replacementForm.email}
                    placeholder="vikram@sassist.com"
                    onChange={(e) =>
                      setReplacementForm({ ...replacementForm, email: e.target.value })
                    }
                    className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={replacementForm.phone}
                    placeholder="+91 98111 22233"
                    onChange={(e) =>
                      setReplacementForm({ ...replacementForm, phone: e.target.value })
                    }
                    className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replacementForm.reassignDirectReports}
                  onChange={(e) =>
                    setReplacementForm({
                      ...replacementForm,
                      reassignDirectReports: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded text-rose-600"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  Automatically reassign direct reporting line to this new employee
                </span>
              </label>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setOccupyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Assign Replacement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELEGATE TEMPORARY ACCESS MODAL */}
      {delegateModalOpen && delegateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-indigo-600">
              <Shield className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Grant Temporary Delegated Access
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Grant another employee temporary access to act on behalf of{" "}
              <strong>{delegateTarget.name}</strong> with automatic expiration.
            </p>

            <form onSubmit={handleDelegateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Delegatee Employee</label>
                <select
                  required
                  value={delegateForm.toEmployeeId}
                  onChange={(e) =>
                    setDelegateForm({ ...delegateForm, toEmployeeId: e.target.value })
                  }
                  className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950"
                >
                  <option value="">-- Choose Delegatee --</option>
                  {employees
                    .filter((e) => e.id !== delegateTarget.id && e.status === "ACTIVE")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.empCode}) — {e.designation}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Automatic Expiry Date</label>
                <input
                  type="date"
                  required
                  value={delegateForm.effectiveEnd}
                  onChange={(e) =>
                    setDelegateForm({ ...delegateForm, effectiveEnd: e.target.value })
                  }
                  className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Reason / Scope</label>
                <input
                  type="text"
                  value={delegateForm.reason}
                  onChange={(e) =>
                    setDelegateForm({ ...delegateForm, reason: e.target.value })
                  }
                  className="w-full text-xs rounded border p-2 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setDelegateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Grant Delegation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL WITH AUDIT TIMELINE */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Employee Record Details & Audit Trail
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
                  Loading profile and change logs...
                </div>
              ) : selectedDetail ? (
                <>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-rose-600">
                        {selectedDetail.empCode}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800">
                        {selectedDetail.status}
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {selectedDetail.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {selectedDetail.designation} • {selectedDetail.department}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Email: {selectedDetail.email} | Phone: {selectedDetail.phone}
                    </div>
                    {selectedDetail.manager && (
                      <div className="pt-2 text-xs text-indigo-600">
                        Reporting to: {selectedDetail.manager.name} ({selectedDetail.manager.designation})
                      </div>
                    )}
                  </div>

                  {/* Audit History Timeline */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                      <History className="w-4 h-4 text-rose-500" />
                      Audit & Ownership Change History ({selectedDetail.auditHistory?.length || 0})
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
                        <div className="text-xs text-slate-400 p-3 bg-slate-50 dark:bg-slate-950/40 rounded-lg">
                          No prior change history logged.
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
    </div>
  );
}

// Recursive Hierarchy Node Renderer
function HierarchyNodeItem({ node, onSelect }: { node: any; onSelect: (id: string) => void }) {
  return (
    <div className="pl-4 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-2">
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-600 px-1.5 py-0.5 rounded">
            {node.empCode}
          </span>
          <div>
            <div
              onClick={() => onSelect(node.id)}
              className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-rose-600 cursor-pointer"
            >
              {node.name}
            </div>
            <div className="text-[10px] text-slate-500">
              {node.designation} • {node.territoryName || "HQ"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {node.status === "VACANT" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              VACANT
            </span>
          )}
          {node.children && node.children.length > 0 && (
            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {node.children.length} direct reports
            </span>
          )}
        </div>
      </div>

      {/* Children Nodes */}
      {node.children && node.children.length > 0 && (
        <div className="space-y-2 pl-3">
          {node.children.map((child: any) => (
            <HierarchyNodeItem key={child.id} node={child} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
