"use client";

import { formatCurrency, cn } from "@/lib/utils";

interface ScoreGridProps {
  scoreCounts: Record<string, number>;
  totalTickets: number;
  onCellClick: (homeScore: number, awayScore: number) => void;
}

export function ScoreGrid({
  scoreCounts,
  totalTickets,
  onCellClick,
}: ScoreGridProps) {
  const scores = [0, 1, 2, 3, 4];
  const totalPool = totalTickets * 2;
  const maxCount = Math.max(...Object.values(scoreCounts), 1);

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full border-collapse min-w-[340px] animate-fade-in">
        <thead>
          <tr>
            <th className="w-12 h-10" />
            <th
              colSpan={5}
              className="text-center text-xs font-bold text-green pb-1"
            >
              🇧🇷 Brasil
            </th>
          </tr>
          <tr>
            <th className="w-12 h-8" />
            {scores.map((s) => (
              <th
                key={s}
                className="text-center text-xs font-semibold text-green w-16 h-8"
              >
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scores.map((away, rowIndex) => (
            <tr key={away}>
              {rowIndex === 0 && (
                <td
                  rowSpan={5}
                  className="w-12 align-middle text-center"
                >
                  <span className="text-xs font-bold text-red-600 [writing-mode:vertical-lr] rotate-180 inline-block">
                    🇲🇦 Marrocos
                  </span>
                </td>
              )}
              {scores.map((home) => {
                const key = `${home}x${away}`;
                const count = scoreCounts[key] || 0;
                const payout = count > 0 ? totalPool / count : 0;
                const intensity = count / maxCount;

                // Dynamic opacity: 0 tickets = zinc, 1+ = green gradient
                const greenOpacity = count > 0 ? Math.round(8 + intensity * 17) : 0;

                return (
                  <td key={key} className="p-0.5">
                    <button
                      onClick={() => onCellClick(home, away)}
                      className={cn(
                        "relative w-full rounded-xl p-2 text-center transition-all hover:shadow-lg hover:scale-105 active:scale-95 border",
                        count > 0
                          ? `border-green/30 hover:border-green/50`
                          : "bg-zinc-50 border-zinc-100 hover:bg-zinc-100"
                      )}
                      style={count > 0 ? { backgroundColor: `rgba(0, 156, 59, ${greenOpacity / 100})` } : undefined}
                    >
                      {/* Badge de contagem */}
                      {count > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-green text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                          {count}
                        </span>
                      )}

                      <div className={cn(
                        "text-sm font-bold",
                        count > 0 ? "text-foreground" : "text-zinc-400"
                      )}>
                        {home}x{away}
                      </div>

                      {count > 0 ? (
                        <div className="text-xs mt-0.5 font-semibold text-amber-600">
                          🏆 {formatCurrency(payout)}
                        </div>
                      ) : (
                        <div className="text-xs mt-0.5 text-zinc-300">
                          disponivel
                        </div>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legenda melhorada */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green/8 border border-green/20" />
          Poucos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green/20 border border-green/30" />
          Popular
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green text-white text-[9px] flex items-center justify-center font-bold">3</span>
          Tickets pagos
        </span>
      </div>
    </div>
  );
}
