"use server";

import { prisma } from "@/lib/prisma";
import { ModuleName } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface BulkImportResult {
  success: boolean;
  importJobId?: string;
  totalRecords: number;
  successCount: number;
  failureCount: number;
  errorReport: { row: number; error: string; sample?: any }[];
  message?: string;
}

/**
 * Universal Server Action for bulk importing verified records across any CRM module
 */
export async function executeUniversalBulkImport(
  module: ModuleName,
  fileName: string,
  records: Record<string, any>[],
  fileType: string = "CSV",
  importedBy: string = "Admin"
): Promise<BulkImportResult> {
  const errorReport: { row: number; error: string; sample?: any }[] = [];
  let successCount = 0;

  try {
    for (let index = 0; index < records.length; index++) {
      const row = records[index];
      const rowNum = index + 1;

      try {
        switch (module) {
          case "ADDRESS": {
            const line1 = row.addressLine1 || row.address;
            const pincode = String(row.pincode || "").trim();
            if (!line1 || !pincode) {
              throw new Error("Address Line 1 and Pincode are required");
            }

            // Check if address already exists
            const existing = await prisma.address.findFirst({
              where: {
                addressLine1: line1,
                pincode: pincode,
              },
            });

            if (existing) {
              await prisma.address.update({
                where: { id: existing.id },
                data: {
                  addressLine2: row.addressLine2 || existing.addressLine2,
                  city: row.city || existing.city,
                  state: row.state || existing.state,
                  country: row.country || existing.country,
                  district: row.district || existing.district,
                  zone: row.zone || existing.zone,
                  territory: row.territory || existing.territory,
                  townLocality: row.townLocality || existing.townLocality,
                  route: row.route || existing.route,
                  beat: row.beat || existing.beat,
                  lat: row.lat !== undefined ? parseFloat(row.lat) || existing.lat : existing.lat,
                  lng: row.lng !== undefined ? parseFloat(row.lng) || existing.lng : existing.lng,
                },
              });
            } else {
              await prisma.address.create({
                data: {
                  addressLine1: line1,
                  addressLine2: row.addressLine2 || null,
                  city: row.city || "Mumbai",
                  state: row.state || "Maharashtra",
                  country: row.country || "India",
                  district: row.district || null,
                  zone: row.zone || "West",
                  territory: row.territory || null,
                  townLocality: row.townLocality || null,
                  pincode: pincode,
                  route: row.route || null,
                  beat: row.beat || null,
                  lat: row.lat ? parseFloat(row.lat) || null : null,
                  lng: row.lng ? parseFloat(row.lng) || null : null,
                  status: row.status || "ACTIVE",
                },
              });
            }
            successCount++;
            break;
          }

          case "CLIENT": {
            const clientCode = (row.clientCode || `CLI-${Date.now().toString().slice(-4)}${rowNum}`).toUpperCase();
            const businessName = row.businessName || row.name;
            const contactName = row.contactName || businessName;
            const phone = String(row.phone || "");

            if (!businessName || !phone) {
              throw new Error("Business Name and Phone are required for Client");
            }

            await prisma.client.upsert({
              where: { clientCode },
              create: {
                clientCode,
                businessName,
                contactName,
                phone,
                email: row.email || null,
                clientType: (row.clientType || "LEAD").toUpperCase(),
                stage: (row.stage || "NEW").toUpperCase(),
                status: (row.status || "ACTIVE").toUpperCase(),
                creditLimit: row.creditLimit ? parseFloat(row.creditLimit) || 0 : 0,
                expectedVal: row.expectedVal ? parseFloat(row.expectedVal) || 0 : 0,
                lat: row.lat ? parseFloat(row.lat) || null : null,
                lng: row.lng ? parseFloat(row.lng) || null : null,
                geoSource: "IMPORT",
                notes: row.notes || "Bulk imported",
              },
              update: {
                businessName,
                contactName,
                phone,
                email: row.email || undefined,
                clientType: row.clientType ? row.clientType.toUpperCase() : undefined,
                stage: row.stage ? row.stage.toUpperCase() : undefined,
                creditLimit: row.creditLimit ? parseFloat(row.creditLimit) : undefined,
                expectedVal: row.expectedVal ? parseFloat(row.expectedVal) : undefined,
              },
            });
            successCount++;
            break;
          }

          case "EMPLOYEE": {
            const empCode = (row.empCode || `EMP-${Date.now().toString().slice(-4)}${rowNum}`).toUpperCase();
            const name = row.name;
            const email = row.email || `${empCode.toLowerCase()}@sassist.crm`;
            const phone = String(row.phone || "9000000000");
            const designation = row.designation || "Sales Representative";

            if (!name || !email) {
              throw new Error("Employee Name and Email are required");
            }

            await prisma.employee.upsert({
              where: { empCode },
              create: {
                empCode,
                name,
                email,
                phone,
                designation,
                department: row.department || "Field Sales",
                status: (row.status || "ACTIVE").toUpperCase(),
                territoryName: row.territoryName || null,
              },
              update: {
                name,
                email,
                phone,
                designation,
                department: row.department || undefined,
                status: row.status ? row.status.toUpperCase() : undefined,
                territoryName: row.territoryName || undefined,
              },
            });
            successCount++;
            break;
          }

          case "PRODUCT": {
            const sku = (row.sku || row.code || `SKU-${Date.now().toString().slice(-4)}${rowNum}`).toUpperCase();
            const name = row.name || row.title;
            const mrp = parseFloat(row.mrp) || 100;
            const basePrice = row.basePrice ? parseFloat(row.basePrice) : mrp * 0.75;
            const distributorPrice = row.distributorPrice ? parseFloat(row.distributorPrice) : mrp * 0.8;
            const retailerPrice = row.retailerPrice ? parseFloat(row.retailerPrice) : mrp * 0.88;

            if (!name) {
              throw new Error("Product Name is required");
            }

            // Ensure a valid categoryId
            const categories = await prisma.category.findMany({ take: 1 });
            let categoryId = categories[0]?.id;
            if (!categoryId) {
              const newCat = await prisma.category.create({
                data: { name: "General FMCG", description: "Default imported goods category" },
              });
              categoryId = newCat.id;
            }

            await prisma.product.upsert({
              where: { sku },
              create: {
                sku,
                name,
                categoryId,
                subcategory: row.subcategory || null,
                brand: row.brand || "In-House",
                productType: row.productType || "FINISHED_GOODS",
                uom: row.uom || "PCS",
                mrp,
                basePrice,
                distributorPrice,
                retailerPrice,
                gstRate: row.gstRate ? parseFloat(row.gstRate) || 18.0 : 18.0,
                stockQuantity: row.stockQuantity ? parseInt(row.stockQuantity, 10) || 100 : 100,
                minOrderQty: row.minOrderQty ? parseInt(row.minOrderQty, 10) || 1 : 1,
                status: (row.status || "ACTIVE").toUpperCase(),
              },
              update: {
                name,
                subcategory: row.subcategory || undefined,
                brand: row.brand || undefined,
                mrp,
                basePrice,
                distributorPrice,
                retailerPrice,
                stockQuantity: row.stockQuantity ? parseInt(row.stockQuantity, 10) : undefined,
                status: row.status ? row.status.toUpperCase() : undefined,
              },
            });
            successCount++;
            break;
          }

          case "SCHEME": {
            const code = (row.code || `SCH-${Date.now().toString().slice(-4)}${rowNum}`).toUpperCase();
            const title = row.title || row.name || "Promotional Scheme";
            const startDate = row.startDate ? new Date(row.startDate) : new Date();
            const endDate = row.endDate ? new Date(row.endDate) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

            await prisma.scheme.upsert({
              where: { code },
              create: {
                code,
                title,
                description: row.description || null,
                type: row.type || "PERCENTAGE_DISCOUNT",
                minOrderQty: row.minOrderQty ? parseInt(row.minOrderQty, 10) || 1 : 1,
                minOrderValue: row.minOrderValue ? parseFloat(row.minOrderValue) || 0 : 0,
                discountPercent: row.discountPercent ? parseFloat(row.discountPercent) || 0 : 0,
                flatDiscount: row.flatDiscount ? parseFloat(row.flatDiscount) || 0 : 0,
                startDate,
                endDate,
                status: (row.status || "ACTIVE").toUpperCase(),
                approvalStatus: "APPROVED",
                isActive: true,
              },
              update: {
                title,
                type: row.type || undefined,
                discountPercent: row.discountPercent ? parseFloat(row.discountPercent) : undefined,
                flatDiscount: row.flatDiscount ? parseFloat(row.flatDiscount) : undefined,
                minOrderQty: row.minOrderQty ? parseInt(row.minOrderQty, 10) : undefined,
                startDate,
                endDate,
                status: row.status ? row.status.toUpperCase() : undefined,
              },
            });
            successCount++;
            break;
          }

          case "TARGET": {
            const targetCode = (row.targetCode || `TGT-${Date.now().toString().slice(-4)}${rowNum}`).toUpperCase();
            const title = row.title || `Target ${targetCode}`;
            const targetValue = row.targetValue ? parseFloat(row.targetValue) || 0 : 50000;
            const targetQuantity = row.targetQuantity ? parseFloat(row.targetQuantity) || 0 : 0;
            const startDate = row.startDate ? new Date(row.startDate) : new Date();
            const endDate = row.endDate ? new Date(row.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            await prisma.target.upsert({
              where: { targetCode },
              create: {
                targetCode,
                title,
                description: row.description || null,
                targetPeriod: (row.targetPeriod || "MONTHLY").toUpperCase(),
                targetMetric: (row.targetMetric || "SALES_VALUE").toUpperCase(),
                dimension: (row.dimension || "EMPLOYEE").toUpperCase(),
                teamName: row.teamName || null,
                targetValue,
                targetQuantity,
                startDate,
                endDate,
                status: "ACTIVE",
                approvalStatus: "APPROVED",
              },
              update: {
                title,
                targetValue,
                targetQuantity,
                startDate,
                endDate,
              },
            });
            successCount++;
            break;
          }

          default:
            throw new Error(`Module ${module} is not supported for bulk import`);
        }
      } catch (rowErr: any) {
        errorReport.push({
          row: rowNum,
          error: rowErr?.message || "Import error",
          sample: row,
        });
      }
    }

    const failureCount = errorReport.length;
    let jobStatus = "COMPLETED";
    if (failureCount > 0 && successCount > 0) {
      jobStatus = "PARTIAL";
    } else if (failureCount > 0 && successCount === 0) {
      jobStatus = "FAILED";
    }

    // Record job log in BulkImportJob
    const job = await prisma.bulkImportJob.create({
      data: {
        module,
        fileName,
        fileType,
        totalRecords: records.length,
        successCount,
        failureCount,
        status: jobStatus,
        errorReportJson: errorReport.slice(0, 100), // cap preview to 100 errors
        importedBy,
      },
    });

    // Write audit log
    try {
      await prisma.auditLog.create({
        data: {
          entityType: `BULK_IMPORT_${module}`,
          entityId: job.id,
          action: "BULK_IMPORT_EXECUTED",
          actorName: importedBy,
          actorEmail: "admin@sassist.crm",
          reason: `Universal bulk import executed for ${module}: ${fileName}`,
          newValues: {
            fileName,
            totalRecords: records.length,
            successCount,
            failureCount,
            status: jobStatus,
          },
        },
      });
    } catch (e) {
      console.error("Audit log error:", e);
    }

    // Revalidate paths
    revalidatePath("/imports");
    if (module === "ADDRESS") revalidatePath("/addresses");
    if (module === "CLIENT") revalidatePath("/clients");
    if (module === "EMPLOYEE") revalidatePath("/employees");
    if (module === "PRODUCT") revalidatePath("/products");
    if (module === "SCHEME") revalidatePath("/schemes");
    if (module === "TARGET") revalidatePath("/targets");

    return {
      success: failureCount === 0 || successCount > 0,
      importJobId: job.id,
      totalRecords: records.length,
      successCount,
      failureCount,
      errorReport,
      message: `Import processed: ${successCount} successful, ${failureCount} failed out of ${records.length} total rows.`,
    };
  } catch (err: any) {
    console.error("Bulk import critical error:", err);
    return {
      success: false,
      totalRecords: records.length,
      successCount,
      failureCount: records.length - successCount,
      errorReport: [{ row: 0, error: err?.message || "Critical failure during bulk processing" }],
      message: err?.message || "Failed to execute bulk import",
    };
  }
}

/**
 * Fetches recent bulk import history jobs
 */
export async function fetchBulkImportHistory(module?: ModuleName) {
  try {
    const where: any = {};
    if (module) where.module = module;

    const jobs = await prisma.bulkImportJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { success: true, data: jobs };
  } catch (error: any) {
    console.error("Error fetching import history:", error);
    return { success: false, data: [] };
  }
}

/**
 * Aggregates statistics for universal bulk imports
 */
export async function getBulkImportStats() {
  try {
    const [totalJobs, completedJobs, partialJobs, failedJobs, recentJobs] = await Promise.all([
      prisma.bulkImportJob.count(),
      prisma.bulkImportJob.count({ where: { status: "COMPLETED" } }),
      prisma.bulkImportJob.count({ where: { status: "PARTIAL" } }),
      prisma.bulkImportJob.count({ where: { status: "FAILED" } }),
      prisma.bulkImportJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      success: true,
      stats: {
        totalJobs,
        completedJobs,
        partialJobs,
        failedJobs,
        recentJobs,
      },
    };
  } catch (error: any) {
    console.error("Error fetching import stats:", error);
    return {
      success: false,
      stats: { totalJobs: 0, completedJobs: 0, partialJobs: 0, failedJobs: 0, recentJobs: [] },
    };
  }
}
