import { DiscoverGate } from "@/components/features/Auth/DiscoverGate";
import { AdoptionDashboard } from "@/components/features/AdoptionDashboard/AdoptionDashboard";

export default function DiscoverPage() {
  return <DiscoverGate><AdoptionDashboard /></DiscoverGate>;
}
