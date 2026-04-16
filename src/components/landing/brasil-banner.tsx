import Image from "next/image";

export default function BrasilBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl h-48 animate-slide-up delay-2">
      {/* Stadium background */}
      <Image
        src="/fotos/estadio-futebol.jpeg"
        alt="Estadio de futebol"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 640px"
      />

      {/* Gradient overlay - Brazilian flag colors */}
      <div className="absolute inset-0 bg-gradient-to-r from-green/80 via-blue/60 to-yellow/50" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3 px-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-3xl block">&#127463;&#127479;</span>
            <span className="text-xs font-bold text-white/90 mt-1 block">BRASIL</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-yellow bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              VS
            </span>
          </div>

          <div className="text-center">
            <span className="text-3xl block">&#127474;&#127462;</span>
            <span className="text-xs font-bold text-white/90 mt-1 block">MARROCOS</span>
          </div>
        </div>

        <div className="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-1.5">
          <p className="text-white font-bold text-sm tracking-wide">
            13 de Junho, 2026
          </p>
        </div>

        <p className="text-white/70 text-xs font-medium">
          Copa do Mundo FIFA 2026 &#127942;
        </p>
      </div>
    </section>
  );
}
