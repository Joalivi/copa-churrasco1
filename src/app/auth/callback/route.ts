import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/confirmar?error=sem_codigo`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Erro ao trocar código:", exchangeError);
    return NextResponse.redirect(`${origin}/confirmar?error=auth_error`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/confirmar?error=sem_usuario`);
  }

  const serviceClient = await createServiceClient();

  // Verificar se usuário já existe na nossa tabela users
  const { data: existingUser } = await serviceClient
    .from("users")
    .select("id, name")
    .eq("supabase_auth_id", user.id)
    .maybeSingle();

  if (existingUser) {
    const params = new URLSearchParams({
      user_id: existingUser.id,
      user_name: existingUser.name,
    });
    return NextResponse.redirect(`${origin}/auth/completo?${params}`);
  }

  // Criar novo usuário com dados do Google
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Usuário";
  const email = user.email ?? null;
  const photoUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  const { data: newUser, error: createError } = await serviceClient
    .from("users")
    .insert({
      name,
      email,
      photo_url: photoUrl,
      auth_provider: "google",
      supabase_auth_id: user.id,
      status: "pending",
    })
    .select("id, name")
    .single();

  if (createError || !newUser) {
    console.error("Erro ao criar usuário:", createError);
    return NextResponse.redirect(`${origin}/confirmar?error=erro_criar`);
  }

  const params = new URLSearchParams({
    user_id: newUser.id,
    user_name: newUser.name,
  });
  return NextResponse.redirect(`${origin}/auth/completo?${params}`);
}
