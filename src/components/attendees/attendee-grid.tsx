"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import { AttendeeCard } from "./attendee-card";

export function AttendeeGrid() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Buscar todos os usuarios (confirmed + pending)
    async function fetchUsers() {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("status", ["confirmed", "pending"])
        .order("created_at", { ascending: true });

      if (!error && data) {
        setUsers(data as User[]);
      }
      setLoading(false);
    }

    fetchUsers();

    // Realtime: escutar mudancas na tabela users
    const channel = supabase
      .channel("users-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newUser = payload.new as User;
            if (newUser.status === "confirmed" || newUser.status === "pending") {
              setUsers((prev) => {
                if (prev.some((u) => u.id === newUser.id)) return prev;
                return [...prev, newUser];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as User;
            setUsers((prev) => {
              if (updated.status === "confirmed" || updated.status === "pending") {
                const exists = prev.find((u) => u.id === updated.id);
                if (exists) {
                  return prev.map((u) =>
                    u.id === updated.id ? updated : u
                  );
                }
                return [...prev, updated];
              }
              return prev.filter((u) => u.id !== updated.id);
            });
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as Partial<User>;
            if (deleted.id) {
              setUsers((prev) => prev.filter((u) => u.id !== deleted.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 rounded skeleton" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card flex flex-col items-center gap-2 py-4">
              <div className="w-16 h-16 rounded-full skeleton" />
              <div className="h-4 w-20 rounded skeleton" />
              <div className="h-3 w-16 rounded skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const confirmed = users.filter((u) => u.status === "confirmed");
  const pending = users.filter((u) => u.status === "pending");

  return (
    <div className="space-y-6">
      {/* Contadores */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-green animate-pulse" />
          <span className="text-lg font-bold text-green">
            {confirmed.length} confirmado{confirmed.length !== 1 ? "s" : ""}
          </span>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow" />
            <span className="text-lg font-bold text-yellow">
              {pending.length} pendente{pending.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Sem ninguem */}
      {users.length === 0 && (
        <div className="card text-center py-8 space-y-2">
          <span className="text-3xl" role="img" aria-label="Pensativo">
            &#129300;
          </span>
          <p className="text-foreground/60 text-sm">
            Nenhum inscrito ainda. Seja o primeiro!
          </p>
          <a href="/confirmar" className="btn-primary inline-block mt-2">
            Confirmar Presenca
          </a>
        </div>
      )}

      {/* Confirmados */}
      {confirmed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-green uppercase tracking-wider">
            Confirmados
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {confirmed.map((user, index) => (
              <div
                key={user.id}
                className={cn(
                  "animate-slide-up",
                  index < 8 ? `delay-${index + 1}` : "delay-8"
                )}
              >
                <AttendeeCard user={user} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pendentes */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-yellow uppercase tracking-wider">
            Pendentes
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {pending.map((user, index) => (
              <div
                key={user.id}
                className={cn(
                  "animate-slide-up",
                  index < 8 ? `delay-${index + 1}` : "delay-8"
                )}
              >
                <AttendeeCard user={user} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
