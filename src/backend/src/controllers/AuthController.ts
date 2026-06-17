import { Request, Response } from "express";
import { getBearerToken, getSupabaseBackendConfig, readJsonResponse, requireAuthenticated } from "./apiSupport";

interface SupabaseAuthUser {
  email?: string;
  id?: string;
  user_metadata?: Record<string, unknown>;
}

export class AuthController {
  requestPasswordRecovery = async (req: Request, res: Response) => {
    const { supabaseUrl, serviceRoleKey } = getSupabaseBackendConfig();
    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({ message: "Variaveis do Supabase nao configuradas" });
      return;
    }

    const email = String(req.body?.email ?? "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      res.status(400).json({ message: "Informe um e-mail valido." });
      return;
    }

    try {
      await fetch(`${supabaseUrl}/auth/v1/recover`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      res.json({ message: "Se o e-mail existir, enviaremos instrucoes para redefinir a senha." });
    } catch {
      // Do not leak account existence or provider availability through this endpoint.
      res.json({ message: "Se o e-mail existir, enviaremos instrucoes para redefinir a senha." });
    }
  };

  changePassword = async (req: Request, res: Response) => {
    try {
      const context = await requireAuthenticated(req, res);
      if (!context) return;

      const currentPassword = String(req.body?.current_password ?? "");
      const newPassword = String(req.body?.new_password ?? "");

      if (currentPassword.length < 6 || newPassword.length < 8) {
        res.status(400).json({ message: "Informe a senha atual e uma nova senha com pelo menos 8 caracteres." });
        return;
      }

      const accessToken = getBearerToken(req.header("authorization"));
      if (!accessToken) {
        res.status(401).json({ message: "Sessao invalida ou ausente." });
        return;
      }

      const authUser = await loadAuthUser(context.supabaseUrl, context.serviceRoleKey, accessToken);
      if (!authUser?.email) {
        res.status(401).json({ message: "Sessao invalida ou sem e-mail confirmado." });
        return;
      }

      const passwordIsValid = await verifyCurrentPassword(context.supabaseUrl, context.serviceRoleKey, authUser.email, currentPassword);
      if (!passwordIsValid) {
        res.status(400).json({ message: "Senha atual invalida." });
        return;
      }

      const updateResponse = await fetch(`${context.supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(context.userId)}`, {
        method: "PUT",
        headers: {
          apikey: context.serviceRoleKey,
          authorization: `Bearer ${context.serviceRoleKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const updateBody = await readJsonResponse(updateResponse);

      if (!updateResponse.ok) {
        res.status(updateResponse.status).json({ message: "Nao foi possivel alterar a senha.", details: updateBody });
        return;
      }

      res.json({ message: "Senha alterada com seguranca." });
    } catch (error) {
      res.status(500).json({
        message: "Nao foi possivel alterar a senha.",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  };
}

async function loadAuthUser(supabaseUrl: string, serviceRoleKey: string, accessToken: string | null) {
  if (!accessToken) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;
  return response.json() as Promise<SupabaseAuthUser>;
}

async function verifyCurrentPassword(supabaseUrl: string, serviceRoleKey: string, email: string, password: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  return response.ok;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
