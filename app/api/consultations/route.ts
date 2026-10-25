import { saveConsultation } from "../../../lib/local-db";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const company = String(body.company ?? "").trim();
    const teamSize = String(body.teamSize ?? "").trim();
    const service = String(body.service ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (name.length < 2 || !emailPattern.test(email) || !service) {
      return Response.json(
        { error: "Please provide a valid name, work email, and service." },
        { status: 400 },
      );
    }
    if ([name, email, company, teamSize, service, message].some((value) => value.length > 2000)) {
      return Response.json({ error: "One or more fields are too long." }, { status: 400 });
    }

    const id = saveConsultation({ name, email, company, teamSize, service, message });
    return Response.json(
      { ok: true, reference: "ORB-" + String(id).padStart(4, "0") },
      { status: 201 },
    );
  } catch (error) {
    console.error("consultation request failed", error);
    return Response.json(
      { error: "We could not save your request. Please try again." },
      { status: 500 },
    );
  }
}
