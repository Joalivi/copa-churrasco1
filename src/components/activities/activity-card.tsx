"use client";

import { useState } from "react";
import Image from "next/image";
import { Activity } from "@/types";
import { PendingToast } from "@/components/layout/pending-toast";
import { formatCurrency, calculateBottleCost, calcChopp, cn } from "@/lib/utils";

// Disclaimer informacional sobre o uso do dinheiro arrecadado em cada
// atividade. Texto fixo (regra do evento) — keyed por activity.name pra
// reaproveitar o lookup que o resto do componente ja faz (ex: linhas que
// tratam Churrasco/Chopp). Se virar muitas atividades ou precisar editar
// pelo admin, mover pra coluna no banco.
const PRIZE_INFO: Record<string, string> = {
  "Bomba Patch":
    "Valor arrecadado vira premio: 70% para o 1º lugar e 30% para o 2º lugar.",
  FIFA: "Valor arrecadado vira premio: 70% para o 1º lugar e 30% para o 2º lugar.",
  Truco:
    "Disputa em duplas. Valor arrecadado vira premio: 70% para a dupla campea e 30% para a dupla vice.",
  "Beer Pong":
    "Valor arrecadado e usado na compra das bebidas do jogo.",
};

interface Participant {
  id: string;
  name: string;
  photo_url: string | null;
}

interface ActivityWithCheckins extends Activity {
  checkin_count: number;
  participants: Participant[];
}

interface ActivityCardProps {
  activity: ActivityWithCheckins;
  userId: string | null;
  eventStatus: string;
  paidCheckinIds: Set<string>;
  onCheckinChange: () => void;
}

export function ActivityCard({
  activity,
  userId,
  eventStatus,
  paidCheckinIds,
  onCheckinChange,
}: ActivityCardProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isCheckedIn = userId
    ? activity.participants.some((p) => p.id === userId)
    : false;

  const isClosed = eventStatus === "closed";
  const isFull =
    activity.max_participants !== null &&
    activity.checkin_count >= activity.max_participants;
  const isPaid = paidCheckinIds.has(activity.id);

  function getCostDisplay(): string {
    switch (activity.cost_type) {
      case "fixed":
        if (activity.cost_fixed === 0) return "Gratuito";
        return `${formatCurrency(activity.cost_fixed ?? 0)}/pessoa`;
      case "per_bottle":
        if (activity.checkin_count === 0) return "Custo por pessoa a definir";
        const bottleCost = calculateBottleCost(
          activity.checkin_count,
          activity.bottle_price ?? 0,
          activity.people_per_bottle ?? 1
        );
        return `~${formatCurrency(bottleCost)}/pessoa`;
      case "total_split": {
        if (activity.checkin_count === 0) return "Valor a definir";
        // Churrasco: 500g/pessoa x R$40/kg = R$20/pessoa
        if (activity.name === "Churrasco") {
          const perPerson = 0.5 * 40;
          return `~${formatCurrency(perPerson)}/pessoa`;
        }
        // Chopp: litros dos barris x R$12/L / checkins
        if (activity.name === "Chopp") {
          const chopp = calcChopp(activity.checkin_count);
          const totalCost = chopp.total * (activity.unit_price ?? 12);
          return `~${formatCurrency(totalCost / activity.checkin_count)}/pessoa`;
        }
        // Outros total_split: usa total_cost do admin
        if (activity.total_cost) {
          const split = activity.total_cost / activity.checkin_count;
          return `~${formatCurrency(split)}/pessoa`;
        }
        return "Valor a definir";
      }
      default:
        return "";
    }
  }

  async function handleToggleCheckin() {
    if (!userId || loading) return;
    setLoading(true);
    const method = isCheckedIn ? "DELETE" : "POST";
    try {
      const res = await fetch("/api/checkins", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          activity_id: activity.id,
        }),
      });

      if (res.ok) {
        onCheckinChange();
        if (method === "POST") {
          setToastMsg(`${activity.emoji ?? "🎯"} ${activity.name} adicionado! Custo: ${getCostDisplay()}`);
        }
      } else if (res.status === 409 && method === "DELETE") {
        const err = await res.json();
        setToastMsg(err.error ?? "Nao e possivel cancelar esta atividade");
        onCheckinChange();
      }
    } finally {
      setLoading(false);
    }
  }

  const costText = getCostDisplay();

  return (
    <div className="card animate-slide-up hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start gap-3">
        {activity.emoji && (
          <span className="text-3xl shrink-0" aria-hidden="true">
            {activity.emoji}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-base">
            {activity.name}
          </h3>
          {activity.description && (
            <p className="text-sm text-zinc-500 mt-0.5">
              {activity.description}
            </p>
          )}

          {/* Disclaimer informacional: uso do dinheiro arrecadado.
              Bloco azul destacado pra diferenciar da descricao "fluff". */}
          {PRIZE_INFO[activity.name] && (
            <div className="mt-2 bg-blue/10 border border-blue/20 rounded-xl px-3 py-2 flex items-start gap-2">
              <span className="text-base shrink-0" aria-hidden="true">
                {activity.name === "Beer Pong" ? "🍺" : "🏆"}
              </span>
              <p className="text-xs text-blue/90 leading-relaxed">
                {PRIZE_INFO[activity.name]}
              </p>
            </div>
          )}

          {/* Info estimativa — Churrasco */}
          {activity.name === "Churrasco" && activity.checkin_count > 0 && (() => {
            const count = activity.checkin_count;
            const meatKg = count * 0.5;
            const meatCost = meatKg * 40;
            return (
              <div className="mt-2 bg-red-50/60 border border-red-100 rounded-xl px-3 py-2 space-y-1">
                <p className="text-xs text-zinc-600">
                  <span className="font-semibold">Carne total:</span> {meatKg.toFixed(1)}kg <span className="text-zinc-400">({count} x 500g)</span>
                </p>
                <p className="text-xs text-zinc-600">
                  <span className="font-semibold">Custo estimado:</span> {formatCurrency(meatCost)} <span className="text-zinc-400">({meatKg.toFixed(1)}kg x R$40)</span>
                </p>
                <p className="text-[10px] text-zinc-400">
                  Fechamento: {formatCurrency(meatCost / count)}/pessoa
                </p>
              </div>
            );
          })()}

          {/* Info estimativa — Chopp */}
          {activity.name === "Chopp" && activity.checkin_count > 0 && (() => {
            const count = activity.checkin_count;
            const chopp = calcChopp(count);
            const barrelParts: string[] = [];
            if (chopp.barrels50 > 0) barrelParts.push(`${chopp.barrels50}x 50L`);
            if (chopp.barrels30 > 0) barrelParts.push(`${chopp.barrels30}x 30L`);
            const barrelText = barrelParts.join(" + ") || "—";
            return (
              <div className="mt-2 bg-amber-50/60 border border-amber-100 rounded-xl px-3 py-2 space-y-1">
                <p className="text-xs text-zinc-600">
                  <span className="font-semibold">Total necessario:</span> {count * 4}L <span className="text-zinc-400">({count} x 4L)</span>
                </p>
                <p className="text-xs text-zinc-600">
                  <span className="font-semibold">Barris:</span> {barrelText} <span className="text-zinc-400">= {chopp.total}L</span>
                </p>
                <p className="text-[10px] text-zinc-400">
                  {chopp.waste > 0 && `${chopp.waste}L de folga`}
                  {chopp.waste < 0 && `${Math.abs(chopp.waste)}L abaixo (dentro da margem 20%)`}
                  {chopp.waste === 0 && "Quantidade exata"}
                </p>
              </div>
            );
          })()}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                costText === "Gratuito"
                  ? "bg-green/10 text-green"
                  : "bg-blue/10 text-blue"
              )}
            >
              {costText}
            </span>

            <span className="text-xs text-zinc-400">
              {activity.checkin_count} participante
              {activity.checkin_count !== 1 ? "s" : ""}
              {activity.max_participants
                ? ` / ${activity.max_participants}`
                : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Botao de checkin */}
      <div className="mt-3 flex items-center gap-2">
        {userId && (
          <button
            onClick={handleToggleCheckin}
            disabled={loading || isClosed || isPaid || (!isCheckedIn && isFull)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
              isPaid
                ? "bg-green/10 text-green cursor-default"
                : isCheckedIn
                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                  : "btn-primary",
              (loading || isClosed || (!isCheckedIn && isFull)) &&
                "opacity-50 cursor-not-allowed"
            )}
          >
            {loading
              ? "Aguarde..."
              : isPaid
                ? "Pago ✓"
                : isCheckedIn
                  ? "Cancelar"
                  : isFull
                    ? "Lotado"
                    : "Participar"}
          </button>
        )}

        {activity.participants.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue hover:underline shrink-0 py-2 px-1"
          >
            {expanded ? "Ocultar" : "Ver participantes"}
          </button>
        )}
      </div>

      {/* Aviso de evento fechado */}
      {isClosed && (
        <p className="text-xs text-zinc-400 mt-2 text-center">
          Inscricoes encerradas
        </p>
      )}

      {/* Lista de participantes */}
      {activity.participants.length > 0 && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            expanded ? "max-h-[500px]" : "max-h-0"
          )}
        >
          <div className={cn(
            "mt-3 pt-3 border-t border-zinc-100",
            !expanded && "border-t-0 pt-0"
          )}>
            <p className="text-xs font-semibold text-zinc-500 mb-2">
              Participantes:
            </p>
            <div className="flex flex-wrap gap-2">
              {activity.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 bg-zinc-50 rounded-full px-2.5 py-1"
                >
                  {p.photo_url ? (
                    <Image
                      src={p.photo_url}
                      alt={p.name}
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-green/20 flex items-center justify-center text-[10px] font-bold text-green">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-zinc-600">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <PendingToast
          message={toastMsg}
          onDismiss={() => setToastMsg(null)}
        />
      )}
    </div>
  );
}
