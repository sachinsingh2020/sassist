import { getDistributorDashboardData } from "@/actions/distributor";
import DistributorPortalClient from "./DistributorPortalClient";

export const dynamic = "force-dynamic";

export default async function DistributorPortalPage() {
  const data = await getDistributorDashboardData();

  return <DistributorPortalClient initialData={data} />;
}
