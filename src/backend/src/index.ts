import express, { Request, Response } from "express";
import cors from "cors";
import { config } from "dotenv";
import path from "path";
import type { MatchResponse } from "@ong-matching-animal/shared/types";

config({ path: path.resolve(__dirname, "../../../.env.local") });

const app = express();

const corsOptions = {
  origin: process.env.NEXT_PUBLIC_FRONTEND_URL, // Domínio permitido
  optionsSuccessStatus: 200 // Suporta navegadores mais antigos
};
// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/onboarding-questions", async (req: Request, res: Response) => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/onboarding_questions?select=id,label,description,placeholder,type,options,required&is_active=eq.true&order=sort_order.asc`, {
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
      },
    });

    const body = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ message: "Nao foi possivel carregar as perguntas", details: body });
      return;
    }

    res.json(body);
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel conectar ao Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

function getSupabaseBackendConfig() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return { supabaseUrl, serviceRoleKey };
}

async function getAuthenticatedUserId(supabaseUrl: string, serviceRoleKey: string, authorization?: string) {
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;

  const user = await response.json() as { id?: string };
  return user.id ?? null;
}

// Endpoints de Tutores
app.post("/api/tutors", async (req: Request, res: Response) => {
  const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
    return;
  }

  const { auth_user_id, name, custom_fields } = req.body as {
    auth_user_id?: string;
    name?: string;
    custom_fields?: Record<string, unknown>;
  };

  if (!auth_user_id || !name || !custom_fields || typeof custom_fields !== "object") {
    res.status(400).json({ message: "Informe auth_user_id, name e custom_fields." });
    return;
  }

  try {
    const authenticatedUserId = await getAuthenticatedUserId(supabaseUrl, serviceRoleKey, req.header("authorization"));

    if (!authenticatedUserId) {
      res.status(401).json({ message: "Sessao invalida ou ausente." });
      return;
    }

    if (authenticatedUserId !== auth_user_id) {
      res.status(403).json({ message: "Nao e permitido salvar perfil de outro usuario." });
      return;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/tutors?on_conflict=auth_user_id`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({ auth_user_id, name, custom_fields }),
    });

    const body = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ message: "Nao foi possivel salvar o tutor", details: body });
      return;
    }

    res.status(201).json(Array.isArray(body) ? body[0] : body);
  } catch (error) {
    res.status(500).json({
      message: "Nao foi possivel conectar ao Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
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
if (process.env.NODE_ENV !== "production" && require.main === module) {
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  app.listen(port, () => {
    console.log(`🚀 Servidor Backend rodando na porta ${port}`);
    console.log(`📍 http://localhost:${port}/api/health`);
  });
}

// Exporta o app para a Vercel transformar em Serverless Function
export default app;
