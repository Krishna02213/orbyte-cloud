import { getPool } from "./postgres.mjs";

export type Consultation = {
  id: number;
  name: string;
  email: string;
  company: string;
  teamSize: string;
  service: string;
  message: string;
  status: string;
  createdAt: string;
};

export async function saveConsultation(input: Omit<Consultation, "id" | "status" | "createdAt">) {
  const result = await getPool().query<{ id: number }>(
    "INSERT INTO public.consultation_requests (name, email, company, team_size, service, message) " +
      "VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
    [input.name, input.email, input.company, input.teamSize, input.service, input.message],
  );
  return result.rows[0].id;
}

export async function listConsultations(): Promise<Consultation[]> {
  const result = await getPool().query<Omit<Consultation, "createdAt"> & { createdAt: Date }>(
    'SELECT id, name, email, company, team_size AS "teamSize", service, message, status, ' +
      'created_at AS "createdAt" FROM public.consultation_requests ' +
      "ORDER BY created_at DESC, id DESC LIMIT 500",
  );
  return result.rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}
