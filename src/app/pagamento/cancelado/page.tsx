import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";

export default function PagamentoCanceladoPage() {
  return (
    <PageContainer>
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        {/* Ícone */}
        <div className="text-7xl">❌</div>

        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold">Pagamento Cancelado</h1>
          <p className="text-sm text-zinc-500 mt-2">
            Seu pagamento foi cancelado. Nenhuma cobrança foi realizada.
          </p>
        </div>

        {/* Card informativo */}
        <div className="card w-full bg-yellow/10 border border-yellow/30 text-left">
          <p className="text-sm font-semibold text-foreground mb-1">
            O que posso fazer?
          </p>
          <ul className="text-xs text-zinc-600 space-y-1 list-disc list-inside">
            <li>Volte à página de pagamento e tente novamente.</li>
            <li>Verifique os dados do seu cartão.</li>
            <li>Entre em contato com o organizador se o problema persistir.</li>
          </ul>
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-3 w-full">
          <Link href="/pagamento" className="btn-primary w-full text-center">
            Tentar novamente
          </Link>
          <Link href="/minha-conta" className="btn-secondary w-full text-center">
            Ver minha conta
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
