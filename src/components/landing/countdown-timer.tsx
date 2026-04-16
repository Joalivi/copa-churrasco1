"use client";

import { useEffect, useState } from "react";

const TARGET_DATE = new Date("2026-06-13T18:00:00-03:00");

interface TimeLeft {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
}

function calculateTimeLeft(): TimeLeft {
  const now = new Date();
  const diff = TARGET_DATE.getTime() - now.getTime();

  if (diff <= 0) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0 };
  }

  return {
    dias: Math.floor(diff / (1000 * 60 * 60 * 24)),
    horas: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutos: Math.floor((diff / (1000 * 60)) % 60),
    segundos: Math.floor((diff / 1000) % 60),
  };
}

export default function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Avoid hydration mismatch: render placeholder on server
  if (!timeLeft) {
    return (
      <section className="bg-green/90 backdrop-blur-md rounded-2xl border border-green/50 shadow-lg shadow-green/15 py-6 px-4 text-center animate-slide-up delay-2">
        <p className="text-sm font-semibold text-green-100 uppercase tracking-[0.2em] mb-4">
          Contagem regressiva
        </p>
        <div className="grid grid-cols-4 gap-3">
          {["Dias", "Horas", "Minutos", "Segundos"].map((label) => (
            <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex flex-col items-center">
              <span className="text-4xl font-extrabold text-yellow tabular-nums leading-none glow-yellow">
                --
              </span>
              <span className="text-xs font-medium text-green-100 mt-1.5">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const units = [
    { label: "Dias", value: timeLeft.dias },
    { label: "Horas", value: timeLeft.horas },
    { label: "Minutos", value: timeLeft.minutos },
    { label: "Segundos", value: timeLeft.segundos },
  ];

  const isOver =
    timeLeft.dias === 0 &&
    timeLeft.horas === 0 &&
    timeLeft.minutos === 0 &&
    timeLeft.segundos === 0;

  return (
    <section className="bg-green/90 backdrop-blur-md rounded-2xl border border-green/50 shadow-lg shadow-green/15 py-6 px-4 text-center animate-slide-up delay-2">
      <p className="text-sm font-semibold text-green-100 uppercase tracking-[0.2em] mb-4">
        {isOver ? "O evento comecou!" : "Contagem regressiva"}
      </p>

      {isOver ? (
        <p className="text-2xl font-bold text-yellow">
          &#127881; E hora do churras! &#127881;
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {units.map(({ label, value }) => (
            <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex flex-col items-center">
              <span
                key={label === "Segundos" ? value : undefined}
                className={`text-4xl font-extrabold text-yellow tabular-nums leading-none glow-yellow${label === "Segundos" ? " animate-count-pulse" : ""}`}
              >
                {String(value).padStart(2, "0")}
              </span>
              <span className="text-xs font-medium text-green-100 mt-1.5">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
