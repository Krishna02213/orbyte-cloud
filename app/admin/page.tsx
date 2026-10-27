import { AdminDashboard } from "../../components/admin-dashboard";
import { listConsultations } from "../../lib/postgres-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminPage() {
  const rows = await listConsultations();
  return (
    <AdminDashboard
      rows={rows}
      displayName="Administrator"
      databaseLabel="PostgreSQL"
    />
  );
}
