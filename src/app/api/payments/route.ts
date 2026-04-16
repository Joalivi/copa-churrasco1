import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return Response.json(
      { error: "user_id e obrigatorio" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payments")
    .select("*, payment_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { error: "Erro ao buscar pagamentos" },
      { status: 500 }
    );
  }

  return Response.json(data);
}
