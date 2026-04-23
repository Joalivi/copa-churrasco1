"use client";

import { useEffect, useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { ScoreGrid } from "@/components/bolao/score-grid";
import { TicketDialog } from "@/components/bolao/ticket-dialog";
import { PhaseBar } from "@/components/layout/phase-bar";
import { BolaoTicket } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";

interface TicketWithUser extends BolaoTicket {
  users: {
    id: string;
    name: string;
    photo_url: string | null;
  };
}

interface BolaoData {
  tickets: TicketWithUser[];
  pendingTickets: TicketWithUser[];
  scoreCounts: Record<string, number>;
  totalTickets: number;
  totalPending: number;
}

export default function BolaoPage() {
  const [data, setData] = useState<BolaoData>({
    tickets: [],
    pendingTickets: [],
    scoreCounts: {},
    totalTickets: 0,
    totalPending: 0,
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{
    home: number;
    away: number;
  } | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem("copa_user_id");
    setUserId(storedId);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/bolao");
      if (res.ok) {
        const bolaoData = await res.json();
        setData(bolaoData);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPool = data.totalTickets * 2;

  // Tickets do usuario
  const userPaidTickets = userId
    ? data.tickets.filter((t) => t.user_id === userId)
    : [];
  const userPendingTickets = userId
    ? (data.pendingTickets || []).filter((t) => t.user_id === userId)
    : [];
  const userTickets = [...userPaidTickets, ...userPendingTickets];
  const paidTicketIds = new Set(userPaidTickets.map((t) => t.id));

  function handleCellClick(homeScore: number, awayScore: number) {
    setSelectedCell({ home: homeScore, away: awayScore });
  }

  return (
    <PageContainer>
      <PhaseBar />
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Bolao</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Faca seu palpite para o jogo e concorra ao premio!
          </p>
        </div>

        {/* Card do jogo */}
        <div className="card bg-gradient-to-b from-blue to-[#001a4d] border border-blue/50 animate-slide-up text-white">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <span className="text-3xl">🇧🇷</span>
              <p className="text-sm font-bold mt-1">Brasil</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-white/60 uppercase tracking-wide">
                vs
              </p>
            </div>
            <div className="text-center">
              <span className="text-3xl">🇲🇦</span>
              <p className="text-sm font-bold mt-1">Marrocos</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-around mt-4 pt-3 border-t border-white/20">
            <div className="text-center">
              <p className="text-lg font-bold text-yellow">
                {formatCurrency(totalPool)}
              </p>
              <p className="text-xs text-white/70 uppercase tracking-wide">
                Total arrecadado
              </p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-yellow">
                {data.totalTickets}
              </p>
              <p className="text-xs text-white/70 uppercase tracking-wide">
                Total de tickets
              </p>
            </div>
          </div>
        </div>

        {/* Aviso de usuario nao identificado */}
        {!userId && !loading && (
          <div className="card bg-yellow/10 border border-yellow/30">
            <p className="text-sm text-foreground">
              Voce precisa confirmar presenca antes de comprar palpites.
            </p>
            <Link
              href="/confirmar"
              className="inline-block mt-2 btn-primary text-sm text-center"
            >
              Confirmar presenca
            </Link>
          </div>
        )}

        {/* Como funciona */}
        <div className="card animate-slide-up delay-2">
          <h2 className="text-sm font-bold text-blue mb-2">
            Como funciona
          </h2>
          <ul className="space-y-1.5 text-xs text-zinc-500">
            <li className="flex gap-2">
              <span className="text-green shrink-0">1.</span>
              Escolha um placar na grade abaixo
            </li>
            <li className="flex gap-2">
              <span className="text-green shrink-0">2.</span>
              Cada ticket custa {formatCurrency(2)}
            </li>
            <li className="flex gap-2">
              <span className="text-green shrink-0">3.</span>
              Se o placar for correto, o premio e dividido entre os
              acertadores
            </li>
            <li className="flex gap-2">
              <span className="text-green shrink-0">4.</span>
              Quanto menos tickets no placar, maior o premio individual!
            </li>
          </ul>
        </div>

        {/* Grade de placares */}
        <div>
          <h2 className="text-sm font-bold text-blue mb-3">
            Escolha seu palpite
          </h2>

          {loading ? (
            <div className="card animate-pulse h-64 flex items-center justify-center">
              <p className="text-sm text-zinc-400">Carregando...</p>
            </div>
          ) : (
            <ScoreGrid
              scoreCounts={data.scoreCounts}
              totalTickets={data.totalTickets}
              onCellClick={handleCellClick}
            />
          )}
        </div>

        {/* Tickets do usuario */}
        {userId && userTickets.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-blue mb-3">
              Seus palpites
            </h2>
            <div className="flex flex-col gap-2">
              {userTickets.map((ticket, index) => {
                const isPaid = paidTicketIds.has(ticket.id);
                return (
                  <div
                    key={ticket.id}
                    className={`card flex items-center justify-between py-3 animate-slide-up delay-${Math.min(index + 1, 8)}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-green">
                          {ticket.home_score}x{ticket.away_score}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Brasil {ticket.home_score} x {ticket.away_score}{" "}
                          Marrocos
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-zinc-400">
                            Custo: {formatCurrency(ticket.cost)}
                          </p>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-medium",
                            isPaid ? "bg-green/10 text-green" : "bg-amber-100 text-amber-600"
                          )}>
                            {isPaid ? "Pago" : "Pendente"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dialog de compra */}
        {selectedCell && (
          <TicketDialog
            homeScore={selectedCell.home}
            awayScore={selectedCell.away}
            currentCount={
              data.scoreCounts[
                `${selectedCell.home}x${selectedCell.away}`
              ] || 0
            }
            totalTickets={data.totalTickets}
            userId={userId}
            onClose={() => setSelectedCell(null)}
            onPurchase={fetchData}
          />
        )}
      </div>
    </PageContainer>
  );
}
