import { getTodayBeatForRep } from "@/actions/visits";
import FieldClient from "./FieldClient";

export const dynamic = "force-dynamic";

export default async function FieldPage() {
  const data = await getTodayBeatForRep();

  return <FieldClient initialData={data} />;
}
