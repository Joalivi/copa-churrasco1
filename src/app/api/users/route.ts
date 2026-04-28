import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { isValidCPF } from "@/lib/validators";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("status", "confirmed")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Erro ao buscar usuarios" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const body = await request.json();
  const { name, instagram, phone, cpf, photo_url, email, auth_provider } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Nome e obrigatorio." },
      { status: 400 }
    );
  }

  // Validar comprimento do nome
  if (name.trim().length > 100) {
    return NextResponse.json(
      { error: "Nome deve ter no maximo 100 caracteres." },
      { status: 400 }
    );
  }

  // Validar CPF se fornecido
  if (cpf && typeof cpf === "string" && cpf.trim().length > 0) {
    if (!isValidCPF(cpf)) {
      return NextResponse.json(
        { error: "CPF invalido." },
        { status: 400 }
      );
    }
  }

  // Se tem instagram e nao tem foto, usar unavatar.io
  let finalPhotoUrl = photo_url || null;
  if (instagram && !finalPhotoUrl) {
    const handle = instagram.replace(/^@/, "").trim();
    if (handle.length > 0 && /^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
      finalPhotoUrl = `https://unavatar.io/instagram/${encodeURIComponent(handle)}`;
    }
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      name: name.trim(),
      instagram: instagram ? instagram.replace(/^@/, "").trim() : null,
      phone: phone || null,
      cpf: cpf ? cpf.trim() : null,
      photo_url: finalPhotoUrl,
      email: email || null,
      auth_provider: auth_provider || "manual",
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      // Conflito de unique constraint (CPF ou supabase_auth_id ja existem).
      // Recupera sessao em vez de bloquear: usuario que perdeu localStorage
      // (limpou navegador, trocou celular) consegue reentrar com mesmo CPF.
      // Espelha comportamento do auth/callback do Google OAuth.
      if (cpf && typeof cpf === "string" && cpf.trim().length > 0) {
        const { data: existing, error: lookupError } = await supabase
          .from("users")
          .select("*")
          .eq("cpf", cpf.trim())
          .single();

        if (lookupError || !existing) {
          console.error("Erro ao recuperar usuario por CPF:", lookupError);
          return NextResponse.json(
            { error: "Erro ao recuperar cadastro" },
            { status: 500 }
          );
        }

        return NextResponse.json(
          { ...existing, recovered: true },
          { status: 200 }
        );
      }

      // Conflito sem CPF (cenario improvavel — cadastro manual sempre tem CPF
      // e Google OAuth usa /auth/callback diretamente). Defesa.
      console.error("Conflito 23505 sem CPF para recuperar:", error);
      return NextResponse.json(
        { error: "Cadastro duplicado" },
        { status: 409 }
      );
    }
    console.error("Users POST error:", error);
    return NextResponse.json({ error: "Erro ao cadastrar usuario" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
