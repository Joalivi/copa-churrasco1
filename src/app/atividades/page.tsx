"use client";

import { useEffect, useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { ActivityCard } from "@/components/activities/activity-card";
import { PhaseBar } from "@/components/layout/phase-bar";
import { Activity } from "@/types";
import Link from "next/link";

interface Participant {
  id: string;
  name: string;
  photo_url: string | null;
}

interface ActivityWithCheckins extends Activity {
  checkin_count: number;
  participants: Participant[];
}

export default function AtividadesPage() {
  const [activities, setActivities] = useState<ActivityWithCheckins[]>([]);
  const [eventStatus, setEventStatus] = useState("open");
  const [userId, setUserId] = useState<string | null>(null);
  const [paidActivityIds, setPaidActivityIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedId = localStorage.getItem("copa_user_id");
    setUserId(storedId);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const uid = localStorage.getItem("copa_user_id");
      const fetches: Promise<Response>[] = [
        fetch("/api/activities"),
        fetch("/api/admin/event-status"),
      ];
      if (uid) {
        fetches.push(fetch(`/api/user-summary?user_id=${uid}`));
      }

      const [activitiesRes, statusRes, summaryRes] = await Promise.all(fetches);

      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setEventStatus(statusData.status);
      }

      // Extrair IDs de atividades já pagas (mapear checkin_id → activity_id)
      if (summaryRes?.ok) {
        const summary = await summaryRes.json();
        // Montar mapa checkin_id → activity_id
        const checkinToActivity: Record<string, string> = {};
        for (const c of summary.activity_checkins || []) {
          checkinToActivity[c.checkin_id] = c.activity_id;
        }
        // Coletar activity_ids cujo checkin foi pago
        const paidIds = new Set<string>();
        for (const payment of summary.payments || []) {
          if (payment.status !== "succeeded") continue;
          for (const item of payment.payment_items || []) {
            if (item.item_type === "activity" && item.item_id) {
              const actId = checkinToActivity[item.item_id];
              if (actId) paidIds.add(actId);
            }
          }
        }
        setPaidActivityIds(paidIds);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtrar atividades obrigatorias (Aviso) - essas sao tratadas no fluxo de confirmacao
  const optionalActivities = activities.filter((a) => !a.is_mandatory);

  return (
    <PageContainer>
      <PhaseBar />
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold">Atividades</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Escolha as atividades que voce quer participar no churras!
          </p>
        </div>

        {/* Aviso de usuario nao identificado */}
        {!userId && !loading && (
          <div className="card bg-yellow/10 border border-yellow/30">
            <p className="text-sm text-foreground">
              Voce precisa confirmar presenca antes de se inscrever nas
              atividades.
            </p>
            <Link
              href="/confirmar"
              className="inline-block mt-2 btn-primary text-sm text-center"
            >
              Confirmar presenca
            </Link>
          </div>
        )}

        {/* Aviso de evento fechado */}
        {eventStatus === "closed" && (
          <div className="card bg-red-50 border border-red-200">
            <p className="text-sm text-red-700 font-medium">
              As inscricoes estao encerradas. Nao e possivel alterar
              participacoes.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="card"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 skeleton rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 skeleton rounded w-1/2" />
                    <div className="h-3 skeleton rounded w-3/4" />
                    <div className="h-3 skeleton rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lista de atividades */}
        {!loading && (
          <div className="flex flex-col gap-3">
            {optionalActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                userId={userId}
                eventStatus={eventStatus}
                paidCheckinIds={paidActivityIds}
                onCheckinChange={fetchData}
              />
            ))}

            {optionalActivities.length === 0 && (
              <div className="card text-center py-10 space-y-2">
                <span className="text-4xl block">🎯</span>
                <p className="text-sm font-medium text-foreground/60">
                  Nenhuma atividade disponivel no momento.
                </p>
                <p className="text-xs text-zinc-400">
                  Volte em breve para ver as atividades!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
