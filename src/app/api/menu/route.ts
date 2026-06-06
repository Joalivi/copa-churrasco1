import { NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface MenuItem {
  name: string;
  category?: string;
  note?: string;
}

/** GET publico: le o cardapio (armazenado em admin_config key='cardapio'). */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_config")
    .select("value")
    .eq("key", "cardapio")
    .maybeSingle();

  let items: MenuItem[] = [];
  if (data?.value) {
    try {
      const parsed = JSON.parse(data.value);
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      // valor corrompido — devolve vazio
    }
  }
  return Response.json({ items });
}

/** POST gated por ADMIN_PIN: substitui o cardapio inteiro (upsert). */
export async function POST(request: NextRequest) {
  const pin = request.headers.get("x-admin-pin");
  if (!pin) {
    return Response.json({ error: "PIN de admin obrigatorio" }, { status: 401 });
  }
  if (pin !== process.env.ADMIN_PIN) {
    return Response.json({ error: "PIN invalido" }, { status: 403 });
  }

  const body = await request.json();
  const items = body?.items;
  if (!Array.isArray(items)) {
    return Response.json({ error: "items deve ser um array" }, { status: 400 });
  }

  const clean: MenuItem[] = items
    .filter((i) => i && typeof i.name === "string" && i.name.trim())
    .slice(0, 100)
    .map((i) => ({
      name: String(i.name).slice(0, 120).trim(),
      ...(i.category ? { category: String(i.category).slice(0, 40) } : {}),
      ...(i.note ? { note: String(i.note).slice(0, 200) } : {}),
    }));

  const serviceClient = await createServiceClient();
  const { error } = await serviceClient
    .from("admin_config")
    .upsert({ key: "cardapio", value: JSON.stringify(clean) }, { onConflict: "key" });

  if (error) {
    console.error("Erro ao salvar cardapio:", error);
    return Response.json({ error: "Erro ao salvar cardapio" }, { status: 500 });
  }
  return Response.json({ items: clean });
}
