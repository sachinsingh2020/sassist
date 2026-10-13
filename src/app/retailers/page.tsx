import { getRetailers, getBeats, getDistributors } from "@/actions/masters";
import RetailerClient from "./RetailerClient";

export const dynamic = "force-dynamic";

export default async function RetailersPage() {
  const [retailers, beats, distributors] = await Promise.all([
    getRetailers(),
    getBeats(),
    getDistributors(),
  ]);

  return (
    <RetailerClient
      initialRetailers={retailers}
      beats={beats}
      distributors={distributors}
    />
  );
}
