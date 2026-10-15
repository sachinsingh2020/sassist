import { getSchemes } from "@/actions/schemes";
import { getProducts } from "@/actions/products";
import { getActiveFieldDefinitions } from "@/actions/masters";
import SchemesClient from "./SchemesClient";

export const dynamic = "force-dynamic";

export default async function SchemesPage() {
  const [schemes, products, fieldDefinitions] = await Promise.all([
    getSchemes(),
    getProducts(),
    getActiveFieldDefinitions("SCHEME"),
  ]);

  return (
    <SchemesClient
      initialSchemes={JSON.parse(JSON.stringify(schemes))}
      products={JSON.parse(JSON.stringify(products))}
      fieldDefinitions={JSON.parse(JSON.stringify(fieldDefinitions))}
    />
  );
}
