"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createClient } from "@/lib/supabase/client";
import { isValidCPF } from "@/lib/validators";
import type { User } from "@/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function CheckinForm() {
  const { userId, setUser } = useCurrentUser();

  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados do fluxo "Ja tenho conta? Entrar com CPF"
  const [recoveryCpf, setRecoveryCpf] = useState("");
  const [recoveryCpfError, setRecoveryCpfError] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce para buscar avatar do Instagram
  const handleInstagramChange = useCallback((value: string) => {
    setInstagram(value);
    setAvatarError(false);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const handle = value.replace(/^@/, "").trim();
    if (handle.length === 0) {
      setAvatarUrl(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setAvatarUrl(`https://unavatar.io/instagram/${handle}`);
    }, 500);
  }, []);

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCpfError(null);

    if (!name.trim()) {
      setError("Por favor, informe seu nome.");
      return;
    }

    if (!cpf.trim()) {
      setCpfError("CPF é obrigatório.");
      return;
    }

    if (!isValidCPF(cpf)) {
      setCpfError("CPF inválido. Verifique o número digitado.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          instagram: instagram.replace(/^@/, "").trim() || null,
          phone: phone.trim() || null,
          cpf: cpf.trim() || null,
          auth_provider: "manual",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao confirmar presenca.");
      }

      const user: User = await response.json();
      setCreatedUser(user);
      setUser(user.id, user.name);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao confirmar presenca."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const [googleLoading, setGoogleLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoveryCpfError(null);

    if (!recoveryCpf.trim()) {
      setRecoveryCpfError("CPF e obrigatorio.");
      return;
    }

    if (!isValidCPF(recoveryCpf)) {
      setRecoveryCpfError("CPF invalido. Verifique o numero digitado.");
      return;
    }

    setRecoveryLoading(true);

    try {
      const response = await fetch("/api/users/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: recoveryCpf.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 404 = CPF nao cadastrado. Mensagem amigavel sugere fluxo de cadastro.
        throw new Error(data.error || "Erro ao recuperar conta.");
      }

      // Sucesso: reusa a mesma tela de "createdUser" (ja diferencia
      // recovered + status pra mostrar "Bem-vindo de volta!" / "Sessao recuperada!")
      setCreatedUser(data as User);
      setUser(data.id, data.name);
    } catch (err) {
      setRecoveryError(
        err instanceof Error ? err.message : "Erro ao recuperar conta."
      );
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch {
      setGoogleLoading(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Confirmei minha presenca no Churras da Copa 2026! Bora? \nhttps://${window.location.host}/confirmar`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Se acabou de se cadastrar, mostrar mensagem de sucesso
  if (createdUser) {
    // API retorna `recovered: true` quando 23505 (CPF ja existia) — usuario
    // perdeu localStorage e reentrou. Diferencia UX entre cadastro novo e
    // recuperacao pra deixar claro o que aconteceu.
    const isRecovered =
      (createdUser as User & { recovered?: boolean }).recovered === true;
    const isAlreadyConfirmed = createdUser.status === "confirmed";

    return (
      <div className="card text-center space-y-4 animate-scale-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-blue/10 flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-blue">
          {isRecovered
            ? isAlreadyConfirmed
              ? "Bem-vindo de volta!"
              : "Sessao recuperada!"
            : "Cadastro realizado!"}
        </h2>

        <div className="flex items-center justify-center gap-3">
          {createdUser.photo_url && !avatarError ? (
            <img
              src={createdUser.photo_url}
              alt={createdUser.name}
              className="w-12 h-12 rounded-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-green text-white flex items-center justify-center font-bold text-sm">
              {getInitials(createdUser.name)}
            </div>
          )}
          <div className="text-left">
            <p className="font-semibold">{createdUser.name}</p>
            {createdUser.instagram && (
              <p className="text-sm text-foreground/60">
                @{createdUser.instagram}
              </p>
            )}
          </div>
        </div>

        {isAlreadyConfirmed ? (
          <div className="bg-green/10 border border-green/30 rounded-xl p-4 text-sm">
            <p>Sua presenca ja esta confirmada. Bom evento!</p>
          </div>
        ) : (
          <div className="bg-yellow/10 border border-yellow/30 rounded-xl p-4 text-sm">
            <p>
              {isRecovered
                ? "Continue de onde parou: pague o aviso da chacara"
                : "Para aparecer na lista de confirmados, pague o aviso da chacara"}{" "}
              <strong>(R$35)</strong>.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <a href="/pagamento" className="btn-primary block text-center">
            Ir para Pagamento
          </a>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-green text-green font-semibold hover:bg-light-green transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Compartilhar no WhatsApp
          </button>
        </div>
      </div>
    );
  }

  // Se ja tem userId salvo, mostrar mensagem
  if (userId) {
    return (
      <div className="card text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 mx-auto rounded-full bg-blue/10 flex items-center justify-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-blue"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-blue">
          Voce ja se cadastrou!
        </h2>

        <div className="bg-yellow/10 border border-yellow/30 rounded-xl p-4 text-sm">
          <p>
            Pague o aviso da chacara <strong>(R$35)</strong> para confirmar sua vaga.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <a href="/pagamento" className="btn-primary block text-center">
            Ir para Pagamento
          </a>
          <a
            href="/confirmados"
            className="btn-secondary block text-center"
          >
            Ver Confirmados
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-5 animate-scale-in">
      <h2 className="text-xl font-bold text-blue text-center">
        Confirme sua presenca
      </h2>

      {/* Google OAuth — destaque principal */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-white border-2 border-blue/30 hover:border-blue hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {googleLoading ? (
          <div className="w-5 h-5 border-2 border-zinc-300 border-t-blue rounded-full animate-spin" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        <span className="text-sm font-semibold text-zinc-700">
          {googleLoading ? "Redirecionando..." : "Entrar com Google"}
        </span>
      </button>

      <p className="text-[11px] text-zinc-400 text-center -mt-2">
        Recomendado — mais rapido e seguro
      </p>

      {/* Divisor */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-foreground/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-foreground/40">ou</span>
        </div>
      </div>

      {/* Botao para expandir cadastro manual */}
      <button
        type="button"
        onClick={() => setShowManualForm(!showManualForm)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-foreground/10 bg-zinc-50 hover:bg-zinc-100 transition-all duration-200 text-sm text-zinc-600"
      >
        <span>Cadastro Manual</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-300 ${showManualForm ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Form manual colapsavel */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          showManualForm ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* Avatar preview */}
          <div className="flex justify-center">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-green shadow-md"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-green/10 border-2 border-dashed border-green/30 flex items-center justify-center">
                {name.trim() ? (
                  <span className="text-green font-bold text-xl">
                    {getInitials(name)}
                  </span>
                ) : (
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-green/40"
                  >
                    <circle cx="12" cy="8" r="5" />
                    <path d="M20 21a8 8 0 0 0-16 0" />
                  </svg>
                )}
              </div>
            )}
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-foreground/15 bg-white focus:outline-none focus:ring-2 focus:ring-green/40 focus:border-green transition-colors input-focus"
            />
          </div>

          {/* Instagram */}
          <div className="space-y-1.5">
            <label htmlFor="instagram" className="block text-sm font-medium">
              @Instagram
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                @
              </span>
              <input
                id="instagram"
                type="text"
                placeholder="seu_instagram"
                value={instagram.replace(/^@/, "")}
                onChange={(e) => handleInstagramChange(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-foreground/15 bg-white focus:outline-none focus:ring-2 focus:ring-green/40 focus:border-green transition-colors input-focus"
              />
            </div>
          </div>

          {/* Telefone */}
          <div className="space-y-1.5">
            <label htmlFor="phone" className="block text-sm font-medium">
              Telefone
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-foreground/15 bg-white focus:outline-none focus:ring-2 focus:ring-green/40 focus:border-green transition-colors input-focus"
            />
          </div>

          {/* CPF */}
          <div className="space-y-1.5">
            <label htmlFor="cpf" className="block text-sm font-medium">
              CPF <span className="text-red-500">*</span>
            </label>
            <input
              id="cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => {
                setCpfError(null);
                setCpf(maskCPF(e.target.value));
              }}
              maxLength={14}
              className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-green/40 focus:border-green transition-colors input-focus ${
                cpfError ? "border-red-400 focus:ring-red-200" : "border-foreground/15"
              }`}
            />
            {cpfError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {cpfError}
              </p>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm text-center">
              {error}
            </div>
          )}

          {/* Botao de submit */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Confirmando..." : "Confirmar Presenca"}
          </button>
        </form>
      </div>

      {/* Botao para expandir recuperacao por CPF (retornante sem Google) */}
      <button
        type="button"
        onClick={() => setShowRecoveryForm(!showRecoveryForm)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-foreground/10 bg-zinc-50 hover:bg-zinc-100 transition-all duration-200 text-sm text-zinc-600"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        <span>Ja tenho conta? Entrar com CPF</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-300 ${
            showRecoveryForm ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Form de recuperacao colapsavel */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          showRecoveryForm ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <form
          onSubmit={handleRecoverySubmit}
          className="space-y-4 pt-1 px-4 py-4 rounded-xl bg-blue/[0.03] border border-blue/10"
        >
          <p className="text-xs text-zinc-600 leading-relaxed">
            Use o mesmo CPF do cadastro anterior pra recuperar sua sessao —
            seus pagamentos e atividades voltam intactos.
          </p>

          {/* CPF */}
          <div className="space-y-1.5">
            <label
              htmlFor="recovery-cpf"
              className="block text-sm font-medium"
            >
              CPF
            </label>
            <input
              id="recovery-cpf"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={recoveryCpf}
              onChange={(e) => {
                setRecoveryCpfError(null);
                setRecoveryError(null);
                setRecoveryCpf(maskCPF(e.target.value));
              }}
              maxLength={14}
              className={`w-full px-4 py-3 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-blue/40 focus:border-blue transition-colors input-focus ${
                recoveryCpfError
                  ? "border-red-400 focus:ring-red-200"
                  : "border-foreground/15"
              }`}
            />
            {recoveryCpfError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                {recoveryCpfError}
              </p>
            )}
          </div>

          {/* Erro do servidor (404 / 500) */}
          {recoveryError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs">
              {recoveryError}
            </div>
          )}

          {/* Botao */}
          <button
            type="submit"
            disabled={recoveryLoading}
            className="w-full py-3 px-4 rounded-xl bg-blue text-white font-semibold hover:bg-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {recoveryLoading ? "Recuperando..." : "Recuperar conta"}
          </button>
        </form>
      </div>

      {/* Erro do Google (fora do form manual) */}
      {error && !showManualForm && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
