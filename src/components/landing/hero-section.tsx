import Link from "next/link";
import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl text-white py-10 px-6 text-center animate-fade-in">
      {/* Background photo */}
      <Image
        src="/fotos/chacara-13.jpeg"
        alt="Piscina do Sítio São José"
        fill
        className="object-cover"
        priority
        sizes="(max-width: 768px) 100vw, 640px"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-green/80 via-green/65 to-[#005a22]/85" />

      {/* Yellow diamond accent */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rotate-45 border-2 border-yellow/20 rounded-md pointer-events-none animate-slow-spin"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <span className="text-4xl animate-slide-up delay-1 animate-float" role="img" aria-label="Bola de futebol">
          &#9917;
        </span>

        <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight animate-slide-up delay-2">
          CHURRAS DA COPA
          <br />
          <span className="text-gradient-yellow">2026</span>
        </h1>

        <div className="flex items-center gap-3 text-lg font-semibold animate-slide-up delay-3">
          <span className="text-xl" role="img" aria-label="Bandeira do Brasil">
            &#127463;&#127479;
          </span>
          <span>Brasil vs Marrocos</span>
          <span className="text-xl" role="img" aria-label="Bandeira do Marrocos">
            &#127474;&#127462;
          </span>
        </div>

        <p className="text-sm font-medium text-green-100">
          Copa do Mundo FIFA 2026
        </p>

        <div className="mt-2 bg-white/15 backdrop-blur-sm rounded-xl px-5 py-3 animate-slide-up delay-4">
          <p className="text-sm font-medium text-green-100 mb-1">
            Entrada &amp; Saida
          </p>
          <p className="text-lg font-bold">
            13/06 <span className="text-yellow">08h</span> &mdash; 14/06{" "}
            <span className="text-yellow">21h</span>
          </p>
        </div>

        <Link
          href="/confirmar"
          className="mt-4 inline-flex items-center gap-2 bg-yellow text-[#1A1A2E] font-bold text-lg px-8 py-3.5 rounded-xl shadow-xl shadow-yellow/30 hover:shadow-2xl hover:shadow-yellow/40 hover:bg-[#e6c900] active:scale-95 transition-all animate-slide-up delay-5 animate-glow-pulse"
        >
          Confirmar Presenca
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </section>
  );
}
