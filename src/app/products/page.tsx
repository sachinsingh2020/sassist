import { getProducts, getCategories, getActiveFieldDefinitions } from "@/actions/masters";
import ProductClient from "./ProductClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, categories, fieldDefinitions] = await Promise.all([
    getProducts(),
    getCategories(),
    getActiveFieldDefinitions("PRODUCT"),
  ]);

  return (
    <ProductClient
      initialProducts={products}
      categories={categories}
      fieldDefinitions={JSON.parse(JSON.stringify(fieldDefinitions))}
    />
  );
}
