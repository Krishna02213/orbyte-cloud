import { AdminDashboard } from "../../components/admin-dashboard";
import { getDatabasePath, listConsultations } from "../../lib/local-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function AdminPage() {
  const rows = listConsultations();
  return (
    <AdminDashboard
      rows={rows}
      displayName="Local administrator"
      databasePath={getDatabasePath()}
    />
  );
}
