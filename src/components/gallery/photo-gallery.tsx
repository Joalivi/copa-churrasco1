"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";

interface Photo {
  src: string;
  alt: string;
  category: string;
}

const photos: Photo[] = [
  // Area Externa
  { src: "/fotos/chacara-07.jpeg", alt: "Entrada do sitio", category: "Area Externa" },
  { src: "/fotos/chacara-08.jpeg", alt: "Entrada com portao e palmeiras", category: "Area Externa" },
  { src: "/fotos/chacara-09.jpeg", alt: "Casa principal com palmeiras", category: "Area Externa" },
  { src: "/fotos/chacara-10.jpeg", alt: "Casa principal vista do gramado", category: "Area Externa" },
  { src: "/fotos/chacara-11.jpeg", alt: "Casinha decorativa no jardim", category: "Area Externa" },
  { src: "/fotos/chacara-12.jpeg", alt: "Lago com fonte decorativa", category: "Area Externa" },
  { src: "/fotos/chacara-17.jpeg", alt: "Jardim com palmeiras", category: "Area Externa" },
  // Piscina
  { src: "/fotos/chacara-13.jpeg", alt: "Piscina com gazebo", category: "Piscina" },
  // Area Gourmet
  { src: "/fotos/chacara-14.jpeg", alt: "Cozinha caipira com fogao a lenha", category: "Area Gourmet" },
  { src: "/fotos/chacara-15.jpeg", alt: "Varanda gourmet com mesa grande", category: "Area Gourmet" },
  { src: "/fotos/chacara-16.jpeg", alt: "Varanda com deck de madeira", category: "Area Gourmet" },
  { src: "/fotos/chacara-21.jpeg", alt: "Churrasqueira e fogao a lenha", category: "Area Gourmet" },
  // Sala
  { src: "/fotos/chacara-01.jpeg", alt: "Sala de estar com sofa", category: "Sala" },
  { src: "/fotos/chacara-02.jpeg", alt: "Sala com TV 55 polegadas", category: "Sala" },
  { src: "/fotos/chacara-04.jpeg", alt: "Sala de estar", category: "Sala" },
  // Quartos
  { src: "/fotos/chacara-03.jpeg", alt: "Quarto casal com duas camas", category: "Quartos" },
  { src: "/fotos/chacara-05.jpeg", alt: "Quarto casal", category: "Quartos" },
  { src: "/fotos/chacara-06.jpeg", alt: "Quarto solteiro com TV", category: "Quartos" },
  // Varanda
  { src: "/fotos/chacara-18.jpeg", alt: "Varanda superior com vista", category: "Varanda" },
  { src: "/fotos/chacara-20.jpeg", alt: "Corredor com rede de descanso", category: "Varanda" },
  // Banheiro
  { src: "/fotos/chacara-19.jpeg", alt: "Banheiro com box e pia", category: "Banheiro" },
  // Area Gourmet (novas)
  { src: "/fotos/chacara-22.jpeg", alt: "Salao com churrasqueira e fogao a lenha", category: "Area Gourmet" },
  { src: "/fotos/chacara-23.jpeg", alt: "Salao com mesa de sinuca", category: "Area Gourmet" },
  // Area Externa (nova)
  { src: "/fotos/chacara-24.jpeg", alt: "Jardim com vista para as montanhas", category: "Area Externa" },
];

const categories = ["Todas", "Area Externa", "Piscina", "Area Gourmet", "Sala", "Quartos", "Varanda", "Banheiro"];

export function PhotoGallery() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState("Todas");
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const filtered = activeCategory === "Todas"
    ? photos
    : photos.filter((p) => p.category === activeCategory);

  const openLightbox = useCallback((idx: number) => setSelectedIdx(idx), []);
  const closeLightbox = useCallback(() => setSelectedIdx(null), []);

  const goNext = useCallback(() => {
    setSelectedIdx((prev) => (prev !== null ? (prev + 1) % filtered.length : null));
  }, [filtered.length]);

  const goPrev = useCallback(() => {
    setSelectedIdx((prev) => (prev !== null ? (prev - 1 + filtered.length) % filtered.length : null));
  }, [filtered.length]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, closeLightbox, goNext, goPrev]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (selectedIdx !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedIdx]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  return (
    <>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setSelectedIdx(null); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              activeCategory === cat
                ? "bg-green text-white shadow-md"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Photo grid */}
      <div className="columns-2 md:columns-3 gap-3 space-y-3">
        {filtered.map((photo, idx) => (
          <button
            key={photo.src}
            onClick={() => openLightbox(idx)}
            className="block w-full break-inside-avoid rounded-xl overflow-hidden shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green/50"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              width={400}
              height={300}
              className="w-full h-auto object-cover"
              loading={idx < 4 ? "eager" : "lazy"}
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selectedIdx !== null && filtered[selectedIdx] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-fade-overlay"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Fechar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-10 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-medium">
            {selectedIdx + 1}/{filtered.length}
          </div>

          {/* Prev button */}
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-2 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Anterior"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Image */}
          <div
            className="relative w-full h-full max-w-4xl max-h-[80vh] mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={filtered[selectedIdx].src}
              alt={filtered[selectedIdx].alt}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          {/* Next button */}
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-2 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Proxima"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Caption */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-1.5 text-white text-sm">
              {filtered[selectedIdx].alt}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
