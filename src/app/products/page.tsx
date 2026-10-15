import { getProducts, getCategories } from "@/actions/products";
import { getActiveFieldDefinitions } from "@/actions/masters";
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
      initialProducts={JSON.parse(JSON.stringify(products))}
      categories={JSON.parse(JSON.stringify(categories))}
      fieldDefinitions={JSON.parse(JSON.stringify(fieldDefinitions))}
    />
  );
}
