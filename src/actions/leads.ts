"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { LeadStage } from "@prisma/client";

export async function getLeadsPipelineData() {
  const [leads, territories, distributors, beats] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.territory.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.distributor.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.beat.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  // Aggregate stats
  const totalValue = leads.reduce((acc, l) => acc + (l.expectedVal || 0), 0);
  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.stage === LeadStage.ONBOARDED).length;

  return {
    leads,
    territories,
    distributors,
    beats,
    stats: {
      totalLeads,
      totalPipelineValue: totalValue,
      wonLeads,
      conversionRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
    },
  };
}

export async function createNewLead(formData: {
  businessName: string;
  contactName: string;
  phone: string;
  email?: string;
  address?: string;
  leadType: string;
  stage?: LeadStage;
  expectedVal?: number;
  notes?: string;
}) {
  const lead = await prisma.lead.create({
    data: {
      businessName: formData.businessName,
      contactName: formData.contactName,
      phone: formData.phone,
      email: formData.email || null,
      address: formData.address || null,
      leadType: formData.leadType,
      stage: formData.stage || LeadStage.NEW,
      expectedVal: Number(formData.expectedVal) || 0.0,
      notes: formData.notes || null,
    },
  });

  revalidatePath("/leads");
  revalidatePath("/");
  return { success: true, lead };
}

export async function updateLeadStage(leadId: string, stage: LeadStage) {
  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { stage },
  });

  revalidatePath("/leads");
  revalidatePath("/");
  return { success: true, lead: updated };
}

export async function convertLeadToEntity(data: {
  leadId: string;
  territoryId?: string;
  beatId?: string;
  distributorId?: string;
}) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch the lead
    const lead = await tx.lead.findUnique({
      where: { id: data.leadId },
    });
    if (!lead) throw new Error("Lead not found");

    let createdEntity: any = null;

    if (lead.leadType === "DISTRIBUTOR") {
      // Create new Distributor
      const territory = data.territoryId
        ? { id: data.territoryId }
        : await tx.territory.findFirst();

      const distCode = `DIST-${lead.businessName.slice(0, 3).toUpperCase()}-${Math.floor(
        100 + Math.random() * 900
      )}`;

      createdEntity = await tx.distributor.create({
        data: {
          name: lead.businessName,
          code: distCode,
          contactPerson: lead.contactName,
          phone: lead.phone,
          email: lead.email || null,
          address: lead.address || "Main Market",
          territoryId: territory!.id,
        },
      });
    } else {
      // Create new Retailer
      const beat = data.beatId ? { id: data.beatId } : await tx.beat.findFirst();
      const distributor = data.distributorId
        ? { id: data.distributorId }
        : await tx.distributor.findFirst();

      createdEntity = await tx.retailer.create({
        data: {
          storeName: lead.businessName,
          ownerName: lead.contactName,
          phone: lead.phone,
          email: lead.email || null,
          address: lead.address || "Market Counter",
          beatId: beat!.id,
          distributorId: distributor!.id,
          lat: 28.6315,
          lng: 77.2167,
        },
      });
    }

    // Mark lead as ONBOARDED
    await tx.lead.update({
      where: { id: data.leadId },
      data: {
        stage: LeadStage.ONBOARDED,
        notes: `Converted to active ${lead.leadType}: ${lead.businessName}`,
      },
    });

    return { lead, createdEntity };
  });

  revalidatePath("/leads");
  revalidatePath("/retailers");
  revalidatePath("/distributors");
  revalidatePath("/");

  return { success: true, result };
}
