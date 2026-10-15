import { getAddresses, getAddressStats } from "@/actions/address";
import { getActiveFieldDefinitions } from "@/actions/masters";
import AddressClient from "./AddressClient";

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const [addresses, stats, fieldDefinitions] = await Promise.all([
    getAddresses(),
    getAddressStats(),
    getActiveFieldDefinitions("ADDRESS"),
  ]);

  return (
    <AddressClient
      initialAddresses={addresses}
      stats={stats}
      fieldDefinitions={JSON.parse(JSON.stringify(fieldDefinitions))}
    />
  );
}
