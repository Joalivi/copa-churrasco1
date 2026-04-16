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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedId = localStorage.getItem("copa_user_id");
    setUserId(storedId);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [activitiesRes, statusRes] = await Promise.all([
        fetch("/api/activities"),
        fetch("/api/admin/event-status"),
      ]);

      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setEventStatus(statusData.status);
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
                onCheckinChange={fetchData}
              />
            ))}

            {optionalActivities.length === 0 && (
              <div className="card text-center">
                <p className="text-sm text-zinc-500">
                  Nenhuma atividade disponivel no momento.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
