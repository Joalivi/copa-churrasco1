"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function CompletoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const userId = searchParams.get("user_id");
    const userName = searchParams.get("user_name");

    if (userId) {
      localStorage.setItem("copa_user_id", userId);
    }
    if (userName) {
      localStorage.setItem("copa_user_name", userName);
    }

    // Redirecionar para pagamento (aviso da chácara)
    router.replace("/pagamento");
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-green border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-zinc-500">Finalizando login com Google...</p>
      </div>
    </div>
  );
}

export default function AuthCompletoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-green border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CompletoContent />
    </Suspense>
  );
}
