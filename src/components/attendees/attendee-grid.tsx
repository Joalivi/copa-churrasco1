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

    // Buscar usuarios confirmados
    async function fetchUsers() {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("status", "confirmed")
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
            if (newUser.status === "confirmed") {
              setUsers((prev) => {
                // Evitar duplicatas
                if (prev.some((u) => u.id === newUser.id)) return prev;
                return [...prev, newUser];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as User;
            setUsers((prev) => {
              // Se ficou confirmed, adicionar ou atualizar
              if (updated.status === "confirmed") {
                const exists = prev.find((u) => u.id === updated.id);
                if (exists) {
                  return prev.map((u) =>
                    u.id === updated.id ? updated : u
                  );
                }
                return [...prev, updated];
              }
              // Se saiu de confirmed, remover
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

  return (
    <div className="space-y-4">
      {/* Contador */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-blue">
          {users.length} confirmado{users.length !== 1 ? "s" : ""}
        </span>
        <span className="inline-block w-2 h-2 rounded-full bg-green animate-pulse" />
      </div>

      {/* Grid */}
      {users.length === 0 ? (
        <div className="card text-center py-8 space-y-2">
          <span className="text-3xl" role="img" aria-label="Pensativo">
            &#129300;
          </span>
          <p className="text-foreground/60 text-sm">
            Nenhum confirmado ainda. Seja o primeiro!
          </p>
          <a href="/confirmar" className="btn-primary inline-block mt-2">
            Confirmar Presenca
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {users.map((user, index) => (
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
      )}
    </div>
  );
}
