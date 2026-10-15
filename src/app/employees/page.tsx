import { getEmployees, getEmployeeStats } from "@/actions/employee";
import { getActiveFieldDefinitions } from "@/actions/masters";
import EmployeeClient from "./EmployeeClient";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const [employees, stats, fieldDefinitions] = await Promise.all([
    getEmployees(),
    getEmployeeStats(),
    getActiveFieldDefinitions("EMPLOYEE"),
  ]);

  return (
    <EmployeeClient
      initialEmployees={employees}
      stats={stats}
      fieldDefinitions={JSON.parse(JSON.stringify(fieldDefinitions))}
    />
  );
}
