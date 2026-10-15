"use client";

import { useState, useTransition, useMemo } from "react";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdatePrices,
  bulkImportProducts,
} from "@/actions/products";
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sliders,
  DollarSign,
  TrendingUp,
  History,
  Trash2,
  Edit,
  X,
  Upload,
  Download,
  Boxes,
  Percent,
  Calendar,
  Layers,
  ArrowUpDown,
  ShieldAlert,
} from "lucide-react";
import DynamicFormRenderer, { FieldDefinitionDTO } from "@/components/custom-fields/DynamicFormRenderer";
import { DynamicTableHeaders, DynamicTableRowCells } from "@/components/custom-fields/DynamicTableColumns";
import {
  parseFileToRows,
  autoMapProductHeaders,
  runProductDryRunValidation,
  exportRecordsToCsv,
} from "@/lib/bulkImportClient";
import Link from "next/link";

interface ProductClientProps {
  initialProducts: any[];
  categories: any[];
  fieldDefinitions?: FieldDefinitionDTO[];
}

export default function ProductClient({
  initialProducts,
  categories,
  fieldDefinitions = [],
}: ProductClientProps) {
  const [products, setProducts] = useState(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedProductType, setSelectedProductType] = useState("ALL");

  // Selection for bulk actions
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [activeDetailProduct, setActiveDetailProduct] = useState<any | null>(null);

  // Loading & alerts
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states (Add / Edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [hsnCode, setHSNCode] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [subcategory, setSubcategory] = useState("");
  const [brand, setBrand] = useState("");
  const [productType, setProductType] = useState("FINISHED_GOODS");
  const [uom, setUom] = useState("PCS");
  const [basePrice, setBasePrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [distributorPrice, setDistributorPrice] = useState("");
  const [retailerPrice, setRetailerPrice] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [stockQuantity, setStockQuantity] = useState("100");
  const [minOrderQty, setMinOrderQty] = useState("1");
  const [status, setStatus] = useState("ACTIVE");
  const [effectiveStartDate, setEffectiveStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveEndDate, setEffectiveEndDate] = useState("");
  const [priceChangeReason, setPriceChangeReason] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});

  // Bulk Price Form State
  const [bulkPriceTarget, setBulkPriceTarget] = useState<"MRP" | "DISTRIBUTOR" | "RETAILER" | "ALL">("ALL");
  const [bulkChangeType, setBulkChangeType] = useState<"PERCENTAGE" | "FLAT">("PERCENTAGE");
  const [bulkChangeValue, setBulkChangeValue] = useState("5");
  const [bulkReason, setBulkReason] = useState("Annual FMCG Trade Revision");
  const [bulkEffectiveDate, setBulkEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  // Bulk Import States
  const [importStep, setImportStep] = useState<"UPLOAD" | "PREVIEW" | "RESULT">("UPLOAD");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Record<string, any>[]>([]);
  const [importValidation, setImportValidation] = useState<any>(null);

  // Distinct brands from products
  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = selectedCategory === "ALL" || p.categoryId === selectedCategory;
      const matchBrand = selectedBrand === "ALL" || p.brand === selectedBrand;
      const matchStatus = selectedStatus === "ALL" || p.status === selectedStatus;
      const matchType = selectedProductType === "ALL" || p.productType === selectedProductType;

      return matchSearch && matchCat && matchBrand && matchStatus && matchType;
    });
  }, [products, searchTerm, selectedCategory, selectedBrand, selectedStatus, selectedProductType]);

  // KPI Calculations
  const totalSkus = products.length;
  const activeSkus = products.filter((p) => p.status === "ACTIVE").length;
  const totalStock = products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
  const avgMargin = useMemo(() => {
    if (products.length === 0) return 0;
    const margins = products
      .filter((p) => p.mrp > 0 && p.retailerPrice > 0)
      .map((p) => ((p.mrp - p.retailerPrice) / p.mrp) * 100);
    if (margins.length === 0) return 0;
    return Math.round((margins.reduce((a, b) => a + b, 0) / margins.length) * 10) / 10;
  }, [products]);

  // Select all toggle
  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    } else {
      setSelectedProductIds([]);
    }
  }

  function handleToggleRowSelect(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  // Open Edit Modal
  function handleOpenEdit(product: any) {
    setEditingId(product.id);
    setName(product.name || "");
    setSku(product.sku || "");
    setBarcode(product.barcode || "");
    setHSNCode(product.hsnCode || "");
    setCategoryId(product.categoryId || categories[0]?.id || "");
    setSubcategory(product.subcategory || "");
    setBrand(product.brand || "");
    setProductType(product.productType || "FINISHED_GOODS");
    setUom(product.uom || "PCS");
    setBasePrice(product.basePrice !== null && product.basePrice !== undefined ? String(product.basePrice) : "");
    setMrp(String(product.mrp || 0));
    setDistributorPrice(String(product.distributorPrice || 0));
    setRetailerPrice(String(product.retailerPrice || 0));
    setGstRate(String(product.gstRate || 18));
    setStockQuantity(String(product.stockQuantity || 0));
    setMinOrderQty(String(product.minOrderQty || 1));
    setStatus(product.status || "ACTIVE");
    setEffectiveStartDate(product.effectiveStartDate ? new Date(product.effectiveStartDate).toISOString().slice(0, 10) : "");
    setEffectiveEndDate(product.effectiveEndDate ? new Date(product.effectiveEndDate).toISOString().slice(0, 10) : "");
    setCustomFields(product.customFields || {});
    setPriceChangeReason("");
    setIsEditModalOpen(true);
  }

  // Handle Create Product
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setCustomFieldErrors({});

    startTransition(async () => {
      try {
        const res = await createProduct({
          name,
          sku,
          barcode,
          hsnCode,
          categoryId,
          subcategory,
          brand,
          productType,
          uom,
          basePrice: basePrice ? parseFloat(basePrice) : 0,
          mrp: parseFloat(mrp),
          distributorPrice: parseFloat(distributorPrice),
          retailerPrice: parseFloat(retailerPrice),
          gstRate: parseFloat(gstRate),
          stockQuantity: parseInt(stockQuantity),
          minOrderQty: parseInt(minOrderQty) || 1,
          status,
          effectiveStartDate: effectiveStartDate || undefined,
          effectiveEndDate: effectiveEndDate || undefined,
          customFields,
        });

        if (res.success && res.product) {
          setProducts([res.product, ...products]);
          setMessage({ type: "success", text: `Product '${res.product.name}' (${res.product.sku}) added successfully!` });
          setIsAddModalOpen(false);
          resetForm();
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to create product" });
      }
    });
  }

  // Handle Update Product
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setMessage(null);

    startTransition(async () => {
      try {
        const res = await updateProduct({
          id: editingId,
          name,
          sku,
          barcode,
          hsnCode,
          categoryId,
          subcategory,
          brand,
          productType,
          uom,
          basePrice: basePrice ? parseFloat(basePrice) : 0,
          mrp: parseFloat(mrp),
          distributorPrice: parseFloat(distributorPrice),
          retailerPrice: parseFloat(retailerPrice),
          gstRate: parseFloat(gstRate),
          stockQuantity: parseInt(stockQuantity),
          minOrderQty: parseInt(minOrderQty) || 1,
          status,
          effectiveStartDate: effectiveStartDate || undefined,
          effectiveEndDate: effectiveEndDate || undefined,
          priceChangeReason,
          customFields,
        });

        if (res.success && res.product) {
          setProducts(products.map((p) => (p.id === editingId ? res.product : p)));
          if (activeDetailProduct?.id === editingId) {
            setActiveDetailProduct(res.product);
          }
          setMessage({ type: "success", text: `Product '${res.product.name}' updated successfully!` });
          setIsEditModalOpen(false);
          resetForm();
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to update product" });
      }
    });
  }

  // Handle Delete Product
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete product '${name}'? This cannot be undone.`)) return;
    setMessage(null);

    startTransition(async () => {
      try {
        const res = await deleteProduct(id);
        if (res.success) {
          setProducts(products.filter((p) => p.id !== id));
          if (activeDetailProduct?.id === id) setActiveDetailProduct(null);
          setMessage({ type: "success", text: `Product '${name}' removed successfully.` });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Failed to delete product" });
      }
    });
  }

  // Handle Bulk Price Revision
  async function handleBulkPriceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedProductIds.length === 0) {
      alert("Please select at least one product using table checkboxes.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await bulkUpdatePrices({
          productIds: selectedProductIds,
          priceTarget: bulkPriceTarget,
          changeType: bulkChangeType,
          changeValue: parseFloat(bulkChangeValue),
          reason: bulkReason,
          effectiveDate: bulkEffectiveDate,
        });

        if (res.success) {
          setMessage({
            type: "success",
            text: `Bulk prices updated for ${res.count} products! Price audit history logged.`,
          });
          setIsBulkPriceModalOpen(false);
          setSelectedProductIds([]);
          // Refresh products
          window.location.reload();
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "Bulk update failed" });
      }
    });
  }

  // File Upload Handler for Bulk Import
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportFile(file);
      const parsed = await parseFileToRows(file);
      setImportHeaders(parsed.headers);
      setImportRows(parsed.rows);

      const mapping = autoMapProductHeaders(parsed.headers);
      const validation = runProductDryRunValidation(parsed.rows, mapping);
      setImportValidation(validation);
      setImportStep("PREVIEW");
    } catch (err: any) {
      alert("Error reading file: " + err.message);
    }
  }

  async function executeBulkImport() {
    if (!importValidation?.sanitizedRecords || importValidation.sanitizedRecords.length === 0) {
      alert("No valid rows to import.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await bulkImportProducts(importValidation.sanitizedRecords);
        if (res.success) {
          setMessage({
            type: "success",
            text: `Successfully imported ${res.count} product SKUs into Master!`,
          });
          setIsBulkImportModalOpen(false);
          window.location.reload();
        }
      } catch (err: any) {
        alert("Import failed: " + err.message);
      }
    });
  }

  function handleExportCsv() {
    const exportData = filteredProducts.map((p) => ({
      SKU: p.sku,
      Name: p.name,
      Category: p.category?.name || "",
      Subcategory: p.subcategory || "",
      Brand: p.brand || "",
      ProductType: p.productType,
      UOM: p.uom,
      BasePrice: p.basePrice || 0,
      MRP: p.mrp,
      DistributorPrice: p.distributorPrice,
      RetailerPrice: p.retailerPrice,
      GSTRate: p.gstRate,
      StockQuantity: p.stockQuantity,
      MinOrderQty: p.minOrderQty,
      Status: p.status,
    }));
    exportRecordsToCsv(`Product_Master_${new Date().toISOString().slice(0, 10)}`, exportData);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setSku("");
    setBarcode("");
    setHSNCode("");
    setSubcategory("");
    setBrand("");
    setProductType("FINISHED_GOODS");
    setUom("PCS");
    setBasePrice("");
    setMrp("");
    setDistributorPrice("");
    setRetailerPrice("");
    setGstRate("18");
    setStockQuantity("100");
    setMinOrderQty("1");
    setStatus("ACTIVE");
    setEffectiveStartDate(new Date().toISOString().slice(0, 10));
    setEffectiveEndDate("");
    setPriceChangeReason("");
    setCustomFields({});
    setCustomFieldErrors({});
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-600/10 text-indigo-600">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Product Master & Price Catalog
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage SKUs, brand catalogs, 3-tier price structures (Base, Landing, Retailer), price revision audit trails, and MOQ rules.
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
              if (selectedProductIds.length === 0) {
                alert("Please select one or more products using the table checkboxes first.");
                return;
              }
              setIsBulkPriceModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition"
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-600" />
            Bulk Price Revision ({selectedProductIds.length})
          </button>

          <button
            onClick={() => {
              setImportStep("UPLOAD");
              setIsBulkImportModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-600" />
            Import Excel/CSV
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
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            Add SKU
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
            <span className="text-xs font-medium text-slate-500">Total SKUs</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Boxes className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{totalSkus}</p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {activeSkus} Active in catalog
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Inventory Units</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Package className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{totalStock.toLocaleString()}</p>
          <span className="text-[11px] text-slate-500">Across central depot</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avg Trade Margin</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Percent className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{avgMargin}%</p>
          <span className="text-[11px] text-slate-500">Retailer margin to MRP</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Brands</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-2">{uniqueBrands.length || 1}</p>
          <span className="text-[11px] text-purple-600 font-medium">Distinct brand labels</span>
        </div>
      </div>

      {/* Multi-Filter Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by SKU, Product Name, Barcode, Brand..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Brands ({uniqueBrands.length})</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="DISCONTINUED">DISCONTINUED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={
                      filteredProducts.length > 0 &&
                      selectedProductIds.length === filteredProducts.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Category / Brand</th>
                <th className="py-3 px-4">UOM</th>
                <th className="py-3 px-4 text-right">Base Wholesale</th>
                <th className="py-3 px-4 text-right">MRP</th>
                <th className="py-3 px-4 text-right">Distributor</th>
                <th className="py-3 px-4 text-right">Retailer</th>
                <th className="py-3 px-4 text-right">Margin %</th>
                <th className="py-3 px-4 text-center">Status</th>
                <DynamicTableHeaders fields={fieldDefinitions} />
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const marginPct =
                  p.mrp > 0 && p.retailerPrice > 0
                    ? Math.round(((p.mrp - p.retailerPrice) / p.mrp) * 1000) / 10
                    : 0;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                    onClick={() => setActiveDetailProduct(p)}
                  >
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => handleToggleRowSelect(p.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-600">
                      {p.sku}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{p.name}</div>
                      {p.barcode && (
                        <span className="font-mono text-[10px] text-slate-400">
                          EAN: {p.barcode}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-700">{p.category?.name || "General"}</div>
                      <div className="text-[10px] text-slate-400">
                        {p.brand ? p.brand : p.subcategory ? p.subcategory : "Standard"}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{p.uom}</td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono">
                      ₹{p.basePrice ? Number(p.basePrice).toFixed(2) : "0.00"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 font-mono">
                      ₹{p.mrp.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 font-mono">
                      ₹{p.distributorPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600 font-mono">
                      ₹{p.retailerPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                        {marginPct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : p.status === "DISCONTINUED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <DynamicTableRowCells fields={fieldDefinitions} customFields={p.customFields} />
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Product"
                          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-indigo-600"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          title="Delete Product"
                          className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={13 + fieldDefinitions.length} className="py-10 text-center text-slate-400">
                    No products found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Detail Slide-Over Drawer */}
      {activeDetailProduct && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                  {activeDetailProduct.sku}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  {activeDetailProduct.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Category: {activeDetailProduct.category?.name || "General"} | Brand: {activeDetailProduct.brand || "Standard"}
                </p>
              </div>
              <button
                onClick={() => setActiveDetailProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-5 space-y-6 flex-1 text-xs">
              {/* Pricing Matrix */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-600">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Commercial Pricing Matrix
                </h3>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Base Wholesale Rate</span>
                    <span className="font-semibold text-slate-800 text-sm">
                      ₹{activeDetailProduct.basePrice ? Number(activeDetailProduct.basePrice).toFixed(2) : "0.00"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Maximum Retail Price (MRP)</span>
                    <span className="font-semibold text-slate-900 text-sm">
                      ₹{activeDetailProduct.mrp.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Distributor Landing</span>
                    <span className="font-semibold text-slate-700 text-sm">
                      ₹{activeDetailProduct.distributorPrice.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Retailer Landing (PTR)</span>
                    <span className="font-semibold text-emerald-600 text-sm">
                      ₹{activeDetailProduct.retailerPrice.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">GST Rate Category</span>
                    <span className="font-semibold text-slate-800">{activeDetailProduct.gstRate}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Min Order Qty (MOQ)</span>
                    <span className="font-semibold text-slate-800">{activeDetailProduct.minOrderQty || 1} {activeDetailProduct.uom}</span>
                  </div>
                </div>
              </div>

              {/* Product Attributes */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-600">
                  <Package className="h-4 w-4 text-indigo-600" />
                  Product Master Attributes
                </h3>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Product Type</span>
                    <span className="font-medium">{activeDetailProduct.productType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Unit of Measure</span>
                    <span className="font-medium">{activeDetailProduct.uom}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Subcategory</span>
                    <span className="font-medium">{activeDetailProduct.subcategory || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Barcode (EAN)</span>
                    <span className="font-mono">{activeDetailProduct.barcode || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Stock on Hand</span>
                    <span className="font-semibold text-emerald-600">{activeDetailProduct.stockQuantity} units</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Historical Orders Reference</span>
                    <span className="font-semibold text-indigo-600">
                      {activeDetailProduct._count?.orderItems || 0} order item(s)
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Revision Audit Trail */}
              <div>
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-600">
                  <History className="h-4 w-4 text-amber-600" />
                  Price Revision Audit History
                </h3>
                {activeDetailProduct.priceHistory && activeDetailProduct.priceHistory.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Effective Date</th>
                          <th className="py-2 px-2 text-right">MRP</th>
                          <th className="py-2 px-2 text-right">Retailer</th>
                          <th className="py-2 px-3">Reason / Changed By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {activeDetailProduct.priceHistory.map((ph: any) => (
                          <tr key={ph.id}>
                            <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                              {new Date(ph.effectiveDate).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-2 text-right font-mono">
                              <span className="text-slate-400 line-through mr-1">₹{ph.oldMrp}</span>
                              <span className="font-semibold text-slate-900">₹{ph.newMrp}</span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-emerald-600 font-semibold">
                              ₹{ph.newRetailerPrice}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              <div className="font-medium">{ph.reason || "Price Change"}</div>
                              <div className="text-[10px] text-slate-400">{ph.changedBy}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                    No price revision records logged for this product.
                  </div>
                )}
              </div>

              {/* Custom Dynamic Fields */}
              {activeDetailProduct.customFields && Object.keys(activeDetailProduct.customFields).length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wider text-slate-600">
                    <Sliders className="h-4 w-4 text-purple-600" />
                    Dynamic Custom Attributes
                  </h3>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                    {Object.entries(activeDetailProduct.customFields).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-slate-400 text-[10px] block capitalize">
                          {k.replace(/_/g, " ")}
                        </span>
                        <span className="font-medium text-slate-800">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  handleOpenEdit(activeDetailProduct);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Product Details
              </button>

              <button
                onClick={() => handleDelete(activeDetailProduct.id, activeDetailProduct.name)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 text-rose-600 bg-rose-50 rounded-lg text-xs font-semibold hover:bg-rose-100 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete SKU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                {isEditModalOpen ? `Edit SKU: ${sku}` : "Register New Product SKU"}
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={isEditModalOpen ? handleUpdate : handleCreate} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Product Name */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Product Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Crisp Bites Tangy Tomato 100g"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                {/* SKU Code */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. SNK-TT-100"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-mono"
                  />
                </div>

                {/* Barcode */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode (EAN-13)</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="e.g. 890123450099"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-mono"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcategory */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g. Namkeen / Potato Chips"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                {/* Brand */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. TastyBites"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                {/* Product Type */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Type</label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white"
                  >
                    <option value="FINISHED_GOODS">Finished Goods</option>
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="PACKAGING">Packaging</option>
                    <option value="PROMOTIONAL">Promotional / Free Item</option>
                  </select>
                </div>

                {/* UOM */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measure (UOM)</label>
                  <select
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white font-mono"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="BOX">BOX</option>
                    <option value="CASE">CASE / CARTON</option>
                    <option value="KG">KG (Kilogram)</option>
                    <option value="LTR">LTR (Litre)</option>
                    <option value="PACK">PACK</option>
                  </select>
                </div>

                {/* Base Price */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base Wholesale Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="e.g. 15.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-mono"
                  />
                </div>

                {/* MRP */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">MRP (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={mrp}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMrp(val);
                      // Auto calculate suggestion if empty
                      if (val && !distributorPrice) {
                        setDistributorPrice((parseFloat(val) * 0.8).toFixed(2));
                      }
                      if (val && !retailerPrice) {
                        setRetailerPrice((parseFloat(val) * 0.88).toFixed(2));
                      }
                    }}
                    placeholder="e.g. 20.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-mono font-semibold"
                  />
                </div>

                {/* Distributor Price */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Distributor Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={distributorPrice}
                    onChange={(e) => setDistributorPrice(e.target.value)}
                    placeholder="e.g. 16.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-mono"
                  />
                </div>

                {/* Retailer Price */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Retailer Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={retailerPrice}
                    onChange={(e) => setRetailerPrice(e.target.value)}
                    placeholder="e.g. 17.60"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-mono font-semibold text-emerald-700"
                  />
                </div>

                {/* GST Rate */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white font-mono"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST (Standard FMCG)</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>

                {/* Stock Quantity */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-mono"
                  />
                </div>

                {/* Min Order Qty */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Order Qty (MOQ)</label>
                  <input
                    type="number"
                    min="1"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none font-mono"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="DISCONTINUED">DISCONTINUED</option>
                  </select>
                </div>

                {/* Effective Start Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Effective Start Date</label>
                  <input
                    type="date"
                    value={effectiveStartDate}
                    onChange={(e) => setEffectiveStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                {/* Effective End Date */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Effective End Date</label>
                  <input
                    type="date"
                    value={effectiveEndDate}
                    onChange={(e) => setEffectiveEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>

                {/* If editing: Price revision reason */}
                {isEditModalOpen && (
                  <div className="sm:col-span-2 bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <label className="block font-semibold text-amber-900 mb-1">
                      Reason for Price Revision (Logged in Audit Trail)
                    </label>
                    <input
                      type="text"
                      value={priceChangeReason}
                      onChange={(e) => setPriceChangeReason(e.target.value)}
                      placeholder="e.g. Q3 Raw Material Cost Correction"
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:outline-none text-amber-900 bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Dynamic Custom Fields Section */}
              {fieldDefinitions.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Dynamic Module Attributes
                  </h3>
                  <DynamicFormRenderer
                    fields={fieldDefinitions}
                    values={customFields}
                    errors={customFieldErrors}
                    onChange={(name, val) => setCustomFields((prev) => ({ ...prev, [name]: val }))}
                  />
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isPending ? "Saving..." : isEditModalOpen ? "Update Product" : "Register SKU"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Price Update Modal */}
      {isBulkPriceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-600" />
                Bulk Price Adjustment ({selectedProductIds.length} SKUs Selected)
              </h2>
              <button onClick={() => setIsBulkPriceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBulkPriceSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Price Tier</label>
                <select
                  value={bulkPriceTarget}
                  onChange={(e: any) => setBulkPriceTarget(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-semibold"
                >
                  <option value="ALL">All Commercial Tiers (MRP, Distributor, Retailer)</option>
                  <option value="MRP">Maximum Retail Price (MRP) Only</option>
                  <option value="DISTRIBUTOR">Distributor Landing Price Only</option>
                  <option value="RETAILER">Retailer Price (PTR) Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Adjustment Type</label>
                  <select
                    value={bulkChangeType}
                    onChange={(e: any) => setBulkChangeType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-semibold"
                  >
                    <option value="PERCENTAGE">Percentage (% Change)</option>
                    <option value="FLAT">Flat Amount (₹ Change)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Value (+ or -)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={bulkChangeValue}
                    onChange={(e) => setBulkChangeValue(e.target.value)}
                    placeholder="e.g. 5 for +5%, or -2.5"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Revision *</label>
                <input
                  type="text"
                  required
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="e.g. FY26 Annual Inflation & GST Adjustment"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  required
                  value={bulkEffectiveDate}
                  onChange={(e) => setBulkEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  All price changes create immutable records in <code>ProductPriceHistory</code>. Historical order lines preserve their original contracted prices.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkPriceModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {isPending ? "Applying..." : "Apply Bulk Revision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Importer Modal */}
      {isBulkImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-emerald-600" />
                Bulk Product Importer (Excel & CSV)
              </h2>
              <button onClick={() => setIsBulkImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {importStep === "UPLOAD" && (
              <div className="space-y-4 mt-4 text-xs">
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-indigo-500 transition cursor-pointer bg-slate-50">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="productBulkUploadInput"
                  />
                  <label htmlFor="productBulkUploadInput" className="cursor-pointer space-y-2 block">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="font-semibold text-slate-700">Click to choose or drag & drop CSV or Excel spreadsheet</p>
                    <p className="text-slate-400 text-[11px]">Supports standard headers: SKU, Name, Category, MRP, Distributor Price, Retailer Price</p>
                  </label>
                </div>
              </div>
            )}

            {importStep === "PREVIEW" && importValidation && (
              <div className="space-y-4 mt-4 text-xs">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Total Rows</span>
                    <span className="text-base font-bold text-slate-900">{importValidation.totalRows}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-emerald-700 block">Valid Rows</span>
                    <span className="text-base font-bold text-emerald-700">{importValidation.validCount}</span>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-rose-700 block">Errors / Skipped</span>
                    <span className="text-base font-bold text-rose-700">{importValidation.errorCount}</span>
                  </div>
                </div>

                {importValidation.rowErrors && importValidation.rowErrors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto bg-rose-50 p-3 rounded-xl border border-rose-200 space-y-1">
                    <span className="font-bold text-rose-800 block text-[11px]">Validation Issues:</span>
                    {importValidation.rowErrors.map((e: any, idx: number) => (
                      <p key={idx} className="text-[11px] text-rose-700">
                        Row {e.row}: {e.message}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setImportStep("UPLOAD")}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                  >
                    Back to Upload
                  </button>
                  <button
                    onClick={executeBulkImport}
                    disabled={importValidation.validCount === 0 || isPending}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {isPending ? "Importing..." : `Import ${importValidation.validCount} Product(s)`}
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
