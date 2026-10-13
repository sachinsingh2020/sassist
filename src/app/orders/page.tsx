import { getAllOrders } from "@/actions/orders";
import OrdersListClient from "./OrdersListClient";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getAllOrders();

  return <OrdersListClient orders={orders} />;
}
