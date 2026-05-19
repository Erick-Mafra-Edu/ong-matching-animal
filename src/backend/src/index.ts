import express, { Request, Response } from "express";
import cors from "cors";
import { MatchingAlgorithm } from "./lib/matching.js";
import type { MatchResponse } from "../../shared/types/index.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Placeholder para endpoints de Tutores
app.post("/api/tutors", (req: Request, res: Response) => {
  res.status(201).json({ message: "Tutor criado com sucesso" });
});

app.get("/api/tutors/:id", (req: Request, res: Response) => {
  res.json({ message: "Implementar carregamento de tutor do Supabase" });
});

// Placeholder para endpoints de Animais
app.get("/api/animals", (req: Request, res: Response) => {
  res.json({ message: "Implementar listagem de animais do Supabase" });
});

app.post("/api/animals", (req: Request, res: Response) => {
  res.status(201).json({ message: "Animal criado com sucesso" });
});

// Placeholder para endpoint de Matching
app.post("/api/match", (req: Request, res: Response) => {
  const { tutor_id } = req.body;
  
  const response: MatchResponse = {
    tutor_id,
    tutor_name: "Placeholder",
    total_animals_evaluated: 0,
    matches: [],
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

// ATENCAO AQUI: Em vez de usar app.listen(), voce deve exportar o app
// Para testar localmente, voce pode usar uma condicional:
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
    console.log(`📍 http://localhost:${port}/api/health`);
  });
}

// Exporta o app para a Vercel transformar em Serverless Function
export default app;
