import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

const VALID_CATEGORIES = ["aluguel", "carne", "bebida", "descartavel", "geral"] as const;

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { error: "Erro ao buscar despesas" },
      { status: 500 }
    );
  }

  return Response.json(data);
}

export async function POST(request: NextRequest) {
  const pin = request.headers.get("x-admin-pin");
  if (!pin) {
    return Response.json(
      { error: "PIN de admin obrigatorio" },
      { status: 401 }
    );
  }

  if (pin !== process.env.ADMIN_PIN) {
    return Response.json({ error: "PIN invalido" }, { status: 403 });
  }

  const body = await request.json();
  const { description, amount, category, receipt_url, split_among_all } = body;

  if (!description || amount === undefined || !category) {
    return Response.json(
      { error: "description, amount e category sao obrigatorios" },
      { status: 400 }
    );
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0 || numAmount >= 100000) {
    return Response.json(
      { error: "amount deve ser maior que 0 e menor que 100000" },
      { status: 400 }
    );
  }

  if (typeof description !== "string" || description.length > 255) {
    return Response.json(
      { error: "description deve ter no maximo 255 caracteres" },
      { status: 400 }
    );
  }

  if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
    return Response.json(
      { error: `category deve ser uma de: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      description,
      amount: Number(amount),
      category,
      receipt_url: receipt_url || null,
      split_among_all: split_among_all ?? true,
      added_by: "admin",
    })
    .select()
    .single();

  if (error) {
    return Response.json(
      { error: "Erro ao criar despesa" },
      { status: 500 }
    );
  }

  return Response.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const pin = request.headers.get("x-admin-pin");
  if (!pin) {
    return Response.json(
      { error: "PIN de admin obrigatorio" },
      { status: 401 }
    );
  }

  if (pin !== process.env.ADMIN_PIN) {
    return Response.json({ error: "PIN invalido" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json(
      { error: "id e obrigatorio" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.from("expenses").delete().eq("id", id);

  if (error) {
    return Response.json(
      { error: "Erro ao deletar despesa" },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
