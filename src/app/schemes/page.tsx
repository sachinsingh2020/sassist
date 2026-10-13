import { getSchemes, getProducts } from "@/actions/masters";
import SchemesClient from "./SchemesClient";

export const dynamic = "force-dynamic";

export default async function SchemesPage() {
  const [schemes, products] = await Promise.all([getSchemes(), getProducts()]);

  return <SchemesClient initialSchemes={schemes} products={products} />;
}
