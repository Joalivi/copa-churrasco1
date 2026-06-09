import { PageContainer } from "@/components/layout/page-container";

export const metadata = {
  title: "Cardápio — Churras da Copa 2026",
};

// Cardápio estático. Pra alterar o menu, edite as seções abaixo e faça deploy.
type Section = {
  emoji: string;
  title: string;
  items: string[];
  stripe: string; // faixa de acento
  badgeBg: string; // fundo do badge do emoji
  dot: string; // cor do bullet
  delay: string; // animação escalonada
};

const SECTIONS: Section[] = [
  {
    emoji: "🔥",
    title: "Churrasco",
    items: [
      "Espeto Swift de Fraldinha",
      "Frango com bacon",
      "Coxa e sobrecoxa",
      "Panceta",
      "Coraçãozinho",
      "Kafta",
      "Alcatra",
      "Ancho",
    ],
    stripe: "bg-red-500",
    badgeBg: "bg-red-100",
    dot: "bg-red-400",
    delay: "delay-1",
  },
  {
    emoji: "🍽️",
    title: "Almoço",
    items: [
      "Arroz",
      "Feijão",
      "Mandioca na manteiga",
      "Milho na manteiga",
      "Maionese",
      "Soja com molho de tomate",
      "Vinagrete",
      "Farofa de milho",
      "Farofa de mandioca",
      "12L de Coca Zero",
    ],
    stripe: "bg-green",
    badgeBg: "bg-light-green",
    dot: "bg-green",
    delay: "delay-2",
  },
  {
    emoji: "🍫",
    title: "Sobremesa",
    items: ["Brigadeiro de cacau de colher"],
    stripe: "bg-amber-500",
    badgeBg: "bg-amber-100",
    dot: "bg-amber-400",
    delay: "delay-3",
  },
];

export default function CardapioPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-5">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl px-6 py-9 text-center animate-fade-in bg-gradient-to-br from-green via-green-dark to-blue shadow-lg shadow-green/20">
          {/* glow radial amarelo */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(255,223,0,0.18), transparent 70%)",
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <span
              className="text-5xl animate-float glow-yellow"
              role="img"
              aria-label="Churrasco"
            >
              🍖
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
              Cardápio
            </h1>
            <p className="text-sm font-semibold text-yellow">
              Churras da Copa 2026
            </p>
            <p className="text-xs text-white/70">Tudo que vai rolar no dia 🔥🇧🇷</p>
          </div>
        </section>

        {/* Seções */}
        <div className="flex flex-col gap-4">
          {SECTIONS.map((sec) => (
            <section
              key={sec.title}
              className={`card relative overflow-hidden animate-slide-up ${sec.delay}`}
            >
              {/* faixa de acento à esquerda */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1.5 ${sec.stripe}`}
                aria-hidden="true"
              />

              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-11 h-11 rounded-2xl ${sec.badgeBg} flex items-center justify-center text-2xl shrink-0`}
                >
                  {sec.emoji}
                </div>
                <h2 className="text-lg font-extrabold text-blue">{sec.title}</h2>
              </div>

              <ul className="flex flex-col gap-2.5">
                {sec.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-sm text-foreground/90 leading-relaxed"
                  >
                    <span
                      className={`mt-[7px] w-1.5 h-1.5 rounded-full ${sec.dot} shrink-0`}
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Rodapé festivo */}
        <p className="text-center text-xs text-zinc-400 animate-fade-in">
          Bom churras, galera! 🇧🇷🔥🍺
        </p>
      </div>
    </PageContainer>
  );
}
