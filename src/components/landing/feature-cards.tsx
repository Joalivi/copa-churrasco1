import Link from "next/link";

const features = [
  {
    title: "Confirmar Presenca",
    description: "Confirme sua ida e pernoite",
    href: "/confirmar",
    emoji: "\u2705",
    bgClass: "bg-green",
    textClass: "text-white",
    descClass: "text-green-100",
    hoverRingClass: "hover:ring-green/30",
    delayClass: "delay-1",
  },
  {
    title: "Atividades",
    description: "Jogos, apostas e diversao",
    href: "/atividades",
    emoji: "\u26BD",
    bgClass: "bg-blue",
    textClass: "text-white",
    descClass: "text-blue-100",
    hoverRingClass: "hover:ring-blue/30",
    delayClass: "delay-2",
  },
  {
    title: "Bolao",
    description: "Palpites e placar do jogo",
    href: "/bolao",
    emoji: "\uD83C\uDFC6",
    bgClass: "bg-yellow",
    textClass: "text-[#1A1A2E]",
    descClass: "text-[#1A1A2E]/70",
    hoverRingClass: "hover:ring-yellow/40",
    delayClass: "delay-3",
  },
  {
    title: "Financeiro",
    description: "Rateio e pagamentos",
    href: "/financeiro",
    emoji: "\uD83D\uDCB0",
    bgClass: "bg-white border border-zinc-200",
    textClass: "text-[#1A1A2E]",
    descClass: "text-zinc-500",
    hoverRingClass: "hover:ring-zinc-200",
    delayClass: "delay-4",
  },
] as const;

export default function FeatureCards() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-blue">Acesso Rapido</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className={`${feature.bgClass} rounded-2xl p-4 flex flex-col gap-2 shadow-sm hover:shadow-md hover:ring-2 ${feature.hoverRingClass} active:scale-[0.97] transition-all duration-200 animate-slide-up ${feature.delayClass}`}
          >
            <span className="text-2xl" aria-hidden="true">
              {feature.emoji}
            </span>
            <h3 className={`font-bold text-sm ${feature.textClass}`}>
              {feature.title}
            </h3>
            <p className={`text-xs ${feature.descClass}`}>
              {feature.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
