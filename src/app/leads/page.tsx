import { getLeadsPipelineData } from "@/actions/leads";
import LeadsPipelineClient from "./LeadsPipelineClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const data = await getLeadsPipelineData();

  return <LeadsPipelineClient initialData={data} />;
}
