import { getBiAnalyticsData } from "@/actions/analytics";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getBiAnalyticsData();

  return <AnalyticsClient initialData={data} />;
}
