import { getTargets } from "@/actions/targets";
import { getEmployees } from "@/actions/employee";
import { getProducts } from "@/actions/products";
import { getActiveFieldDefinitions } from "@/actions/masters";
import { prisma } from "@/lib/prisma";
import TargetClient from "./TargetClient";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  const [targets, employees, products, territories, fieldDefinitions] = await Promise.all([
    getTargets(),
    getEmployees(),
    getProducts(),
    prisma.territory.findMany({ orderBy: { name: "asc" } }),
    getActiveFieldDefinitions("TARGET"),
  ]);

  return (
    <TargetClient
      initialTargets={JSON.parse(JSON.stringify(targets))}
      employees={JSON.parse(JSON.stringify(employees))}
      products={JSON.parse(JSON.stringify(products))}
      territories={JSON.parse(JSON.stringify(territories))}
      fieldDefinitions={JSON.parse(JSON.stringify(fieldDefinitions))}
    />
  );
}
