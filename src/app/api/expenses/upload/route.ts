import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/**
 * Upload da foto da nota fiscal para o bucket publico 'receipts' do Supabase
 * Storage. Gate por ADMIN_PIN (header x-admin-pin). Retorna a URL publica.
 *
 * Aceita multipart/form-data com o campo "file".
 */
export async function POST(request: NextRequest) {
  const pin = request.headers.get("x-admin-pin");
  if (!pin) {
    return Response.json({ error: "PIN de admin obrigatorio" }, { status: 401 });
  }
  if (pin !== process.env.ADMIN_PIN) {
    return Response.json({ error: "PIN invalido" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Envie a imagem como multipart/form-data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Campo 'file' obrigatorio" }, { status: 400 });
  }

  if (!ALLOWED.includes(file.type)) {
    return Response.json(
      { error: "Formato invalido. Use JPEG, PNG, WebP ou HEIC." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "Imagem muito grande (maximo 5 MB)." },
      { status: 400 }
    );
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;

  const serviceClient = await createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await serviceClient.storage
    .from("receipts")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Erro no upload da nota:", uploadError);
    const missingBucket = /bucket.*not.*found/i.test(uploadError.message);
    return Response.json(
      {
        error: missingBucket
          ? "Bucket 'receipts' nao existe no Supabase Storage."
          : "Erro ao subir a imagem.",
      },
      { status: missingBucket ? 503 : 500 }
    );
  }

  const { data: pub } = serviceClient.storage.from("receipts").getPublicUrl(path);

  return Response.json({ url: pub.publicUrl }, { status: 201 });
}
