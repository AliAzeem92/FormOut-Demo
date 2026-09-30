import { ShipLinkApp } from "./components/ShipLinkApp";

export const dynamic = "force-dynamic";

export default function HomePage() {
  // Read MOCK_COURIER strictly on the server; never expose raw envs or secrets
  const isMockCourier = process.env.MOCK_COURIER === "true";

  return <ShipLinkApp isMockCourier={isMockCourier} />;
}
