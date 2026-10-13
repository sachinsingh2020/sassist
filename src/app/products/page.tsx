import { getProducts, getCategories } from "@/actions/masters";
import ProductClient from "./ProductClient";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return <ProductClient initialProducts={products} categories={categories} />;
}
