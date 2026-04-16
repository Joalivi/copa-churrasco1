"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

/** Calcula barris de chopp necessarios.
 *  - 4L por pessoa
 *  - Barris de 30L ou 50L
 *  - Pode arredondar para baixo ate 20% da quantidade necessaria
 */
function calcChopp(people: number) {
  const needed = people * 4;
  const minAcceptable = needed * 0.8;

  // Tenta combinacoes de barris (max 5 de cada para cobrir ate 125 pessoas)
  let best = { barrels30: 0, barrels50: 0, total: 0, waste: Infinity };

  for (let b50 = 0; b50 <= 5; b50++) {
    for (let b30 = 0; b30 <= 5; b30++) {
      const total = b50 * 50 + b30 * 30;
      if (total >= minAcceptable) {
        const waste = total - needed;
        // Prefer menos desperdicio, e menos barris no empate
        if (
          Math.abs(waste) < Math.abs(best.waste) ||
          (Math.abs(waste) === Math.abs(best.waste) && b50 + b30 < best.barrels50 + best.barrels30)
        ) {
          best = { barrels30: b30, barrels50: b50, total, waste };
        }
      }
    }
  }

  return best;
}

export default function EventDetails() {
  const [churrascoCount, setChurrascoCount] = useState(0);
  const [choppCount, setChoppCount] = useState(0);

  useEffect(() => {
    fetch("/api/activities")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          const churrasco = data.find((a: { name: string }) => a.name === "Churrasco");
          const chopp = data.find((a: { name: string }) =>
            a.name.toLowerCase().includes("chopp")
          );
          setChurrascoCount(churrasco?.checkin_count ?? 0);
          setChoppCount(chopp?.checkin_count ?? churrasco?.checkin_count ?? 0);
        }
      })
      .catch(() => {});
  }, []);

  const meatKg = churrascoCount * 0.5;
  const meatCost = meatKg * 40;
  const chopp = calcChopp(choppCount);

  // Descricao dos barris
  const barrelParts: string[] = [];
  if (chopp.barrels50 > 0) barrelParts.push(`${chopp.barrels50}x 50L`);
  if (chopp.barrels30 > 0) barrelParts.push(`${chopp.barrels30}x 30L`);
  const barrelText = barrelParts.join(" + ") || "—";

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-blue">Detalhes do Evento</h2>

      {/* Location Card */}
      <div className="card animate-slide-up delay-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center shrink-0">
            <span className="text-2xl" aria-hidden="true">
              &#128205;
            </span>
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              Local
            </h3>
            <p className="text-sm text-zinc-600 mt-1">
              Sitio Sao Jose
            </p>
            <p className="text-sm text-zinc-500">
              Bairro das Campininhas, Caldas/MG
            </p>
            <Link href="/fotos" className="flex gap-2 mt-3">
              {["/fotos/chacara-13.jpeg", "/fotos/chacara-09.jpeg", "/fotos/chacara-21.jpeg"].map((src) => (
                <div key={src} className="relative w-16 h-12 rounded-lg overflow-hidden shadow-sm">
                  <Image src={src} alt="Foto da chacara" fill className="object-cover" sizes="64px" />
                </div>
              ))}
              <div className="w-16 h-12 rounded-lg bg-green/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-green">+18</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Capacity Card */}
      <div className="card animate-slide-up delay-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center shrink-0">
            <span className="text-2xl" aria-hidden="true">
              &#128101;
            </span>
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              Capacidade
            </h3>
            <p className="text-sm text-zinc-600 mt-1">
              &#127774; Dia: ate 25 pessoas
            </p>
            <p className="text-sm text-zinc-600">
              &#127769; Pernoite: ate 16 pessoas
            </p>
          </div>
        </div>
      </div>

      {/* Churrasco Card */}
      {churrascoCount > 0 && (
        <div className="card bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 animate-slide-up delay-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <span className="text-2xl" aria-hidden="true">&#129385;</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base text-foreground">
                Churrasco
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {churrascoCount} pessoas &middot; 500g por pessoa &middot; R$40/kg
              </p>
              <div className="mt-2 space-y-2">
                <div className="bg-white/80 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total de carne</p>
                  <p className="text-sm font-bold text-foreground">
                    {meatKg.toFixed(1)}kg
                    <span className="text-xs font-normal text-zinc-400 ml-1">
                      ({churrascoCount} x 500g)
                    </span>
                  </p>
                </div>
                <div className="bg-white/80 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Custo estimado</p>
                  <p className="text-sm font-bold text-red-600">
                    {formatCurrency(meatCost)}
                    <span className="text-xs font-normal text-zinc-400 ml-1">
                      ({meatKg.toFixed(1)}kg x R$40)
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2">
                &#128101; {churrascoCount} no churrasco &middot; Fechamento: {formatCurrency(meatCost / churrascoCount)}/pessoa
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chopp Card */}
      {choppCount > 0 && (
        <div className="card bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-100 animate-slide-up delay-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-2xl" aria-hidden="true">&#127866;</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base text-foreground">
                Chopp
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {choppCount} pessoas &middot; 4L por pessoa &middot; barris de 30L ou 50L
              </p>
              <div className="mt-2 space-y-2">
                <div className="bg-white/80 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Total necessario</p>
                  <p className="text-sm font-bold text-foreground">
                    {choppCount * 4}L
                    <span className="text-xs font-normal text-zinc-400 ml-1">
                      ({choppCount} x 4L)
                    </span>
                  </p>
                </div>
                <div className="bg-white/80 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Barris</p>
                  <p className="text-sm font-bold text-amber-600">
                    {barrelText}
                    <span className="text-xs font-normal text-zinc-400 ml-1">
                      = {chopp.total}L
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2">
                &#127866; {chopp.total}L em barris
                {chopp.waste > 0 && ` · ${chopp.waste}L de folga`}
                {chopp.waste < 0 && ` · ${Math.abs(chopp.waste)}L abaixo (dentro da margem 20%)`}
                {chopp.waste === 0 && ` · quantidade exata`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Structure Card */}
      <div className="card animate-slide-up delay-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center shrink-0">
            <span className="text-2xl" aria-hidden="true">
              &#127968;
            </span>
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              Estrutura
            </h3>
            <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-zinc-600">
              <li>&#127946; Piscina (8h-18h)</li>
              <li>&#128293; Churrasqueira</li>
              <li>&#127860; Area gourmet</li>
              <li>&#127921; Mesa de bilhar</li>
              <li>&#128250; TV 55&quot;</li>
              <li>&#128716; 3 quartos</li>
              <li>&#128293; Fogao a lenha</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Rules Card */}
      <div className="card animate-slide-up delay-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center shrink-0">
            <span className="text-2xl" aria-hidden="true">
              &#128220;
            </span>
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              Regras
            </h3>
            <ul className="mt-1 space-y-1 text-sm text-zinc-600">
              <li>
                &#128264; Silencio apos as 22h
              </li>
              <li>
                &#128663; Maximo 10 veiculos
              </li>
              <li>
                &#127946; Piscina disponivel ate 18h
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Cost Card */}
      <div className="card bg-gradient-to-r from-light-green to-green/5 border border-green/20 animate-slide-up delay-7">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center shrink-0">
            <span className="text-2xl" aria-hidden="true">
              &#128176;
            </span>
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              Valor do Aluguel
            </h3>
            <p className="text-sm text-zinc-600 mt-1">
              <span className="font-bold text-green text-base">
                R$ 1.650,00
              </span>{" "}
              dividido entre todos os confirmados
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
