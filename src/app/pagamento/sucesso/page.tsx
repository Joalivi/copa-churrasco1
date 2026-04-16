"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";

function SucessoContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="text-7xl animate-bounce">✅</div>

      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-brasil-green)" }}>
          Pagamento Confirmado!
        </h1>
        <p className="text-sm text-zinc-500 mt-2">
          Seu pagamento foi recebido com sucesso.
        </p>
      </div>

      <div className="card w-full text-left" style={{ background: "rgba(0,156,59,0.05)", border: "1px solid rgba(0,156,59,0.2)" }}>
        <p className="text-sm font-semibold text-foreground mb-1">
          O que acontece agora?
        </p>
        <ul className="text-xs text-zinc-600 space-y-1 list-disc list-inside">
          <li>Seu pagamento será processado em instantes.</li>
          <li>Seu status será atualizado automaticamente.</li>
          <li>Você pode acompanhar tudo na sua conta.</li>
        </ul>
      </div>

      {sessionId && (
        <div className="card w-full bg-zinc-50 border border-zinc-100">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-medium mb-0.5">
            Referência do pagamento
          </p>
          <p className="text-xs text-zinc-500 font-mono break-all">{sessionId}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full">
        <Link href="/minha-conta" className="btn-primary w-full text-center">
          Ver minha conta
        </Link>
        <Link href="/" className="btn-secondary w-full text-center">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

export default function PagamentoSucessoPage() {
  return (
    <PageContainer>
      <Suspense fallback={<div className="py-8 text-center text-zinc-400">Carregando...</div>}>
        <SucessoContent />
      </Suspense>
    </PageContainer>
  );
}
