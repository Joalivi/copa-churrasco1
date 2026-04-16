"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const USER_ID_KEY = "copa_user_id";
const USER_NAME_KEY = "copa_user_name";

interface CurrentUser {
  userId: string | null;
  userName: string | null;
  isLoading: boolean;
  setUser: (id: string, name: string) => void;
  clearUser: () => void;
}

export function useCurrentUser(): CurrentUser {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ler do localStorage
    const storedId = localStorage.getItem(USER_ID_KEY);
    const storedName = localStorage.getItem(USER_NAME_KEY);

    if (storedId) {
      setUserId(storedId);
      setUserName(storedName);
    }

    // Verificar sessao Supabase Auth (para login com Google)
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && !storedId) {
        // Buscar usuario real na tabela users pelo supabase_auth_id
        const { data: dbUser } = await supabase
          .from("users")
          .select("id, name")
          .eq("supabase_auth_id", session.user.id)
          .maybeSingle();

        if (dbUser) {
          setUserId(dbUser.id);
          setUserName(dbUser.name);
          localStorage.setItem(USER_ID_KEY, dbUser.id);
          localStorage.setItem(USER_NAME_KEY, dbUser.name);
        }
      }
      setIsLoading(false);
    });
  }, []);

  const setUser = useCallback((id: string, name: string) => {
    setUserId(id);
    setUserName(name);
    localStorage.setItem(USER_ID_KEY, id);
    localStorage.setItem(USER_NAME_KEY, name);
  }, []);

  const clearUser = useCallback(() => {
    setUserId(null);
    setUserName(null);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_NAME_KEY);
  }, []);

  return { userId, userName, isLoading, setUser, clearUser };
}
