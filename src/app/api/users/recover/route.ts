import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { isValidCPF } from "@/lib/validators";

/**
 * Recupera sessao de cadastro manual por CPF.
 *
 * Usado pelo fluxo "Ja tenho conta? Entrar com CPF" — usuario que perdeu
 * localStorage (limpou navegador, trocou celular) reentra digitando so o
 * CPF, sem precisar relembrar nome/telefone/instagram.
 *
 * Devolve o usuario do banco com `recovered: true` pro front diferenciar
 * a tela de sucesso. Nao atualiza nenhum campo — recovery e somente leitura
 * (mesma decisao do handler 23505 em POST /api/users).
 *
 * Threat model: CPF e a chave do recovery, igual ao fluxo de cadastro
 * manual com 23505. Nao piora seguranca vs. estado atual; melhora UX.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { cpf } = body;

  // Validacao de input
  if (!cpf || typeof cpf !== "string" || cpf.trim().length === 0) {
    return NextResponse.json(
      { error: "CPF e obrigatorio." },
      { status: 400 }
    );
  }

  if (!isValidCPF(cpf)) {
    return NextResponse.json(
      { error: "CPF invalido." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: existing, error } = await supabase
    .from("users")
    .select("*")
    .eq("cpf", cpf.trim())
    .maybeSingle();

  if (error) {
    console.error("Recover GET error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cadastro" },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json(
      {
        error:
          "Nao encontramos cadastro com esse CPF. Verifique o numero ou cadastre-se como novo participante.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { ...existing, recovered: true },
    { status: 200 }
  );
}
