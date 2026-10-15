import { fetchScheduledChanges, getScheduleMetrics, getSchedulableEntities } from "@/actions/schedule";
import ScheduleClient from "./ScheduleClient";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const [changesRes, metricsRes, entitiesRes] = await Promise.all([
    fetchScheduledChanges("ALL"),
    getScheduleMetrics(),
    getSchedulableEntities(),
  ]);

  return (
    <ScheduleClient
      initialChanges={changesRes.data || []}
      initialMetrics={metricsRes.metrics}
      schedulableEntities={
        entitiesRes.data || {
          products: [],
          targets: [],
          schemes: [],
          employees: [],
          rules: [],
        }
      }
    />
  );
}
