import { getSlaPolicies, getSlaExecutions } from "@/actions/sla";
import { getActiveFieldDefinitions } from "@/actions/masters";
import SlaClient from "./SlaClient";

export const dynamic = "force-dynamic";

export default async function SlaPage() {
  const [policies, executions, fieldDefinitions] = await Promise.all([
    getSlaPolicies(),
    getSlaExecutions(),
    getActiveFieldDefinitions("SLA"),
  ]);

  return (
    <SlaClient
      initialPolicies={JSON.parse(JSON.stringify(policies))}
      initialExecutions={JSON.parse(JSON.stringify(executions))}
      fieldDefinitions={JSON.parse(JSON.stringify(fieldDefinitions))}
    />
  );
}
