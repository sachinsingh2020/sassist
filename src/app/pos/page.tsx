import { getPosDashboardData } from "@/actions/pos";
import PosClient from "./PosClient";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const data = await getPosDashboardData();

  return <PosClient initialData={data} />;
}
