import Image from "next/image";
import Link from "next/link";
import { TOTAL_RENTAL } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

export default function EventDetails() {

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
                {formatCurrency(TOTAL_RENTAL)}
              </span>{" "}
              dividido entre todos os confirmados
            </p>
          </div>
        </div>
      </div>

      {/* Google Maps */}
      <div className="card animate-slide-up delay-8 overflow-hidden">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-green/10 flex items-center justify-center shrink-0">
            <span className="text-2xl" aria-hidden="true">
              &#128506;
            </span>
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              Como Chegar
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              Sitio Sao Jose, Laranjeiras de Caldas
            </p>
          </div>
        </div>
        <div className="rounded-xl overflow-hidden -mx-4 -mb-4">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3702.729263606041!2d-46.4335778239139!3d-21.86797627999981!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94c9ed089060fe95%3A0xc20c96607c87a7e6!2sS%C3%ADtio%20S%C3%A3o%20Jos%C3%A9%20Laranjeiras%20de%20Caldas!5e0!3m2!1spt-BR!2sbr!4v1776905415151!5m2!1spt-BR!2sbr"
            width="100%"
            height="250"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa do Sitio Sao Jose"
          />
        </div>
      </div>
    </section>
  );
}
