import {
  getAutomationRules,
  getAutomationExecutionLogs,
  seedDefaultAutomationRules,
} from "@/actions/automation";
import { getActiveFieldDefinitions } from "@/actions/masters";
import AutomationClient from "./AutomationClient";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  // Ensure default enterprise rules exist
  await seedDefaultAutomationRules();

  const [rules, executionLogs, fieldDefinitions] = await Promise.all([
    getAutomationRules(),
    getAutomationExecutionLogs(),
    getActiveFieldDefinitions("AUTOMATION"),
  ]);

  return (
    <AutomationClient
      initialRules={JSON.parse(JSON.stringify(rules))}
      initialLogs={JSON.parse(JSON.stringify(executionLogs))}
      fieldDefinitions={JSON.parse(JSON.stringify(fieldDefinitions))}
    />
  );
}
