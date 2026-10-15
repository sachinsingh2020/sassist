import { getClients, getClientStats } from "@/actions/client";
import { getAddresses } from "@/actions/address";
import { getEmployees } from "@/actions/employee";
import { getActiveFieldDefinitions } from "@/actions/masters";
import ClientMasterView from "./ClientMasterView";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [clients, stats, addresses, employees, fieldDefinitions] = await Promise.all([
    getClients(),
    getClientStats(),
    getAddresses({ status: "ACTIVE" }),
    getEmployees({ status: "ACTIVE" }),
    getActiveFieldDefinitions("CLIENT"),
  ]);

  return (
    <ClientMasterView
      initialClients={clients}
      stats={stats}
      addresses={addresses}
      employees={employees}
      fieldDefinitions={JSON.parse(JSON.stringify(fieldDefinitions))}
    />
  );
}
