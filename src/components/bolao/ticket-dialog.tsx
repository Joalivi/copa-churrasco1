"use client";

import { useState } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { PendingToast } from "@/components/layout/pending-toast";

interface TicketDialogProps {
  homeScore: number;
  awayScore: number;
  currentCount: number;
  totalTickets: number;
  userId: string | null;
  onClose: () => void;
  onPurchase: () => void;
}

export function TicketDialog({
  homeScore,
  awayScore,
  currentCount,
  totalTickets,
  userId,
  onClose,
  onPurchase,
}: TicketDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const ticketCost = 2;
  const totalCost = quantity * ticketCost;
  const futureTotal = totalTickets + quantity;
  const futureCount = currentCount + quantity;
  const estimatedPayout = (futureTotal * ticketCost) / futureCount;

  async function handlePurchase() {
    if (!userId || loading) return;
    setLoading(true);
    try {
      let errorMsg: string | null = null;
      for (let i = 0; i < quantity; i++) {
        const res = await fetch("/api/bolao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            home_score: homeScore,
            away_score: awayScore,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          errorMsg = err.error || `Erro ao registrar palpite (status ${res.status})`;
          break;
        }
      }

      if (errorMsg) {
        // Mantem dialog aberto, user pode ajustar ou fechar manualmente
        setToastMsg(`⚠️ ${errorMsg}`);
      } else {
        onPurchase();
        setToastMsg(
          `🎯 Palpite ${homeScore}x${awayScore} registrado! ${quantity > 1 ? `${quantity} tickets — ` : ""}${formatCurrency(totalCost)} adicionado ao extrato.`
        );
        // Fecha o dialog depois do toast aparecer
        setTimeout(onClose, 1500);
      }
    } catch {
      setToastMsg("⚠️ Erro de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-overlay"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md mx-auto p-6 pb-32 sm:pb-6 shadow-xl animate-slide-up-modal">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"
          aria-label="Fechar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Placar selecionado */}
        <div className="text-center mb-5">
          <p className="text-xs text-zinc-400 mb-2 uppercase tracking-wide font-medium">
            Seu palpite
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="text-center">
              <p className="text-xs text-zinc-500 mb-1">Brasil</p>
              <span className="text-4xl font-bold text-green glow-green">
                {homeScore}
              </span>
            </div>
            <span className="text-2xl text-zinc-300 font-light">x</span>
            <div className="text-center">
              <p className="text-xs text-zinc-500 mb-1">Marrocos</p>
              <span className="text-4xl font-bold text-red-600">
                {awayScore}
              </span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-zinc-50/80 backdrop-blur-sm border border-zinc-100 rounded-xl p-3 mb-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Custo por ticket</span>
            <span className="font-medium">{formatCurrency(ticketCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Palpites neste placar</span>
            <span className="font-medium">{currentCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Retorno estimado</span>
            <span className="font-semibold text-green">
              ~{formatCurrency(estimatedPayout)}
            </span>
          </div>
        </div>

        {/* Seletor de quantidade */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-zinc-500 mb-2 block">
            Quantidade de tickets
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-lg font-bold text-zinc-600 hover:bg-zinc-200 disabled:opacity-40 active:scale-95 transition-transform"
            >
              -
            </button>
            <span className="text-2xl font-bold text-foreground w-10 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(Math.min(5, quantity + 1))}
              disabled={quantity >= 5}
              className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-lg font-bold text-zinc-600 hover:bg-zinc-200 disabled:opacity-40 active:scale-95 transition-transform"
            >
              +
            </button>
            <span className="text-sm text-zinc-400 ml-auto">
              Total: {formatCurrency(totalCost)}
            </span>
          </div>
        </div>

        {/* Botao de compra */}
        {userId ? (
          <button
            onClick={handlePurchase}
            disabled={loading}
            className={cn(
              "w-full btn-primary text-center",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? "Processando..." : `Confirmar palpite — ${quantity === 1 ? "R$2,00" : formatCurrency(totalCost)} no extrato`}
          </button>
        ) : (
          <p className="text-sm text-center text-zinc-500">
            Voce precisa estar identificado para comprar palpites.
          </p>
        )}

        {toastMsg && (
          <PendingToast
            message={toastMsg}
            onDismiss={() => setToastMsg(null)}
            durationMs={2500}
          />
        )}
      </div>
    </div>
  );
}
