import { fetchBulkImportHistory, getBulkImportStats } from "@/actions/bulkImport";
import ImportsClient from "./ImportsClient";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const [historyRes, statsRes] = await Promise.all([
    fetchBulkImportHistory(),
    getBulkImportStats(),
  ]);

  return (
    <ImportsClient
      initialHistory={historyRes.data || []}
      initialStats={statsRes.stats}
    />
  );
}
