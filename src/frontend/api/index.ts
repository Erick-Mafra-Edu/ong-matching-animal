export default function handler(req: any, res: any) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const { pathname } = url;
  const method = (req.method ?? "GET").toUpperCase();

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (pathname === "/api/health" && method === "GET") {
    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }

  if (pathname === "/api/tutors" && method === "POST") {
    return res.status(201).json({ message: "Tutor criado com sucesso" });
  }

  if (pathname.startsWith("/api/tutors/") && method === "GET") {
    return res
      .status(200)
      .json({ message: "Implementar carregamento de tutor do Supabase" });
  }

  if (pathname === "/api/animals" && method === "GET") {
    return res
      .status(200)
      .json({ message: "Implementar listagem de animais do Supabase" });
  }

  if (pathname === "/api/animals" && method === "POST") {
    return res.status(201).json({ message: "Animal criado com sucesso" });
  }

  if (pathname === "/api/match" && method === "POST") {
    const tutorId = req.body?.tutor_id ?? null;

    return res.status(200).json({
      tutor_id: tutorId,
      tutor_name: "Placeholder",
      total_animals_evaluated: 0,
      matches: [],
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(404).json({ error: "Not found" });
}