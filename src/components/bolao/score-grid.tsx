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

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full border-collapse min-w-[340px] animate-fade-in">
        <thead>
          <tr>
            {/* Canto superior esquerdo */}
            <th className="w-12 h-10" />
            {/* Header: Brasil */}
            <th
              colSpan={5}
              className="text-center text-xs font-bold text-green pb-1"
            >
              Brasil
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
              {/* Label lateral: Marrocos */}
              {rowIndex === 0 && (
                <td
                  rowSpan={5}
                  className="w-12 align-middle text-center"
                >
                  <span className="text-xs font-bold text-red-600 writing-mode-vertical [writing-mode:vertical-lr] rotate-180 inline-block">
                    Marrocos
                  </span>
                </td>
              )}
              {scores.map((home) => {
                const key = `${home}x${away}`;
                const count = scoreCounts[key] || 0;
                const payout =
                  count > 0 ? totalPool / count : 0;

                return (
                  <td key={key} className="p-0.5">
                    <button
                      onClick={() => onCellClick(home, away)}
                      className={cn(
                        "w-full rounded-lg p-1.5 text-center transition-all hover:shadow-md hover:scale-105 active:scale-95 border",
                        count > 0
                          ? "bg-gradient-to-b from-green/5 to-green/10 border-green/25 hover:bg-green/10"
                          : "bg-zinc-50 border-zinc-100 hover:bg-zinc-100"
                      )}
                    >
                      <div className="text-xs font-bold text-foreground">
                        {home}x{away}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] mt-0.5",
                          count > 0 ? "text-green font-medium" : "text-zinc-400"
                        )}
                      >
                        {count > 0 ? `${count} ticket${count > 1 ? "s" : ""}` : "--"}
                      </div>
                      <div
                        className={cn(
                          "text-[9px] mt-0.5 font-semibold",
                          count > 0 ? "text-amber-600 font-bold" : "text-transparent"
                        )}
                      >
                        {count > 0 ? formatCurrency(payout) : "--"}
                      </div>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green/30" />
          Com palpites
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-zinc-200" />
          Sem palpites
        </span>
      </div>
    </div>
  );
}
