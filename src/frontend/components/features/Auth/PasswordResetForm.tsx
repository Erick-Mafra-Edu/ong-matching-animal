"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { resetAccountPassword } from "@/lib/account";

export function PasswordResetForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas nao conferem.");
      return;
    }

    setLoading(true);
    try {
      await resetAccountPassword(password);
      setSuccess(true);
      setTimeout(() => {
        router.push("/discover");
      }, 3000);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Nao foi possivel redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-black text-cyan-100">Senha redefinida!</h2>
        <p className="text-slate-400">Sua senha foi atualizada com sucesso. Redirecionando para o painel...</p>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Nova Senha</span>
        <input 
          className="form-control" 
          name="password" 
          type="password" 
          autoComplete="new-password" 
          placeholder="Mínimo de 8 caracteres" 
          value={password} 
          onChange={(event) => setPassword(event.target.value)} 
          required 
        />
      </label>
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Confirmar Nova Senha</span>
        <input 
          className="form-control" 
          name="confirm_password" 
          type="password" 
          autoComplete="new-password" 
          placeholder="Repita a nova senha" 
          value={confirmPassword} 
          onChange={(event) => setConfirmPassword(event.target.value)} 
          required 
        />
      </label>
      {error && <p className="text-sm text-pink-300" role="alert">{error}</p>}
      <Button className="w-full" disabled={loading} type="submit">{loading ? "Redefinindo..." : "Salvar nova senha"}</Button>
    </form>
  );
}
