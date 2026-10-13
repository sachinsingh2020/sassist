import { getProducts, getCategories, getRetailers, getSchemes } from "@/actions/masters";
import { prisma } from "@/lib/prisma";
import OrderPadClient from "./OrderPadClient";

export const dynamic = "force-dynamic";

interface NewOrderPageProps {
  searchParams: Promise<{
    retailerId?: string;
    visitId?: string;
  }>;
}

export default async function NewOrderPage({ searchParams }: NewOrderPageProps) {
  const params = await searchParams;
  const retailerId = params.retailerId;
  const visitId = params.visitId;

  const [products, categories, retailers, schemes, repUser] = await Promise.all([
    getProducts(),
    getCategories(),
    getRetailers(),
    getSchemes(),
    prisma.user.findFirst({
      where: { email: "rep@sassist.com" },
    }),
  ]);

  const initialRetailer = retailerId
    ? retailers.find((r) => r.id === retailerId)
    : retailers[0];

  return (
    <OrderPadClient
      initialRetailer={initialRetailer}
      retailers={retailers}
      products={products}
      categories={categories}
      schemes={schemes}
      repId={repUser?.id || ""}
      visitId={visitId}
    />
  );
}
