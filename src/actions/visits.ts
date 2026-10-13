"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { VisitStatus } from "@prisma/client";

export async function getTodayBeatForRep(repEmail?: string) {
  // Find the rep user (defaulting to the seeded rep)
  const user = await prisma.user.findFirst({
    where: {
      email: repEmail || "rep@sassist.com",
    },
  });

  if (!user) {
    throw new Error("Field Rep user not found");
  }

  // Find beats assigned to this rep
  const beats = await prisma.beat.findMany({
    where: {
      assignedToId: user.id,
    },
    include: {
      territory: true,
      retailers: {
        include: {
          distributor: true,
          visits: {
            where: {
              createdAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  // Calculate today's coverage stats
  const allRetailers = beats.flatMap((b) => b.retailers);
  const totalOutlets = allRetailers.length;
  const visitedOutlets = allRetailers.filter(
    (r) => r.visits.length > 0 && r.visits[0].status !== VisitStatus.CHECKED_IN
  ).length;
  const activeCheckIn = allRetailers
    .map((r) => r.visits[0])
    .find((v) => v && v.status === VisitStatus.CHECKED_IN);

  return {
    rep: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
    beats,
    stats: {
      totalOutlets,
      visitedOutlets,
      coveragePercent: totalOutlets > 0 ? Math.round((visitedOutlets / totalOutlets) * 100) : 0,
    },
    activeVisit: activeCheckIn || null,
  };
}

export async function checkInOutlet(data: {
  retailerId: string;
  beatId: string;
  repId: string;
  lat?: number;
  lng?: number;
}) {
  const visit = await prisma.visit.create({
    data: {
      retailerId: data.retailerId,
      beatId: data.beatId,
      repId: data.repId,
      lat: data.lat || null,
      lng: data.lng || null,
      status: VisitStatus.CHECKED_IN,
      checkIn: new Date(),
    },
    include: {
      retailer: true,
    },
  });

  revalidatePath("/field");
  revalidatePath("/visits");
  return { success: true, visit };
}

export async function checkOutOutlet(data: {
  visitId: string;
  status: VisitStatus;
  noOrderReason?: string;
  notes?: string;
}) {
  const visit = await prisma.visit.update({
    where: { id: data.visitId },
    data: {
      checkOut: new Date(),
      status: data.status,
      noOrderReason: data.noOrderReason || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/field");
  revalidatePath("/visits");
  return { success: true, visit };
}

export async function getAllVisitsHistory() {
  return await prisma.visit.findMany({
    include: {
      rep: true,
      retailer: true,
      beat: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
