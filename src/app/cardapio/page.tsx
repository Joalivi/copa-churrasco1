import { PageContainer } from "@/components/layout/page-container";

export const metadata = {
  title: "Cardápio — Churras da Copa 2026",
};

// Cardápio estático. Pra alterar o menu, edite as seções abaixo e faça deploy.
const SECTIONS: { emoji: string; title: string; items: string[] }[] = [
  {
    emoji: "🔥",
    title: "Churrasco",
    items: [
      "Espeto Swift de Fraldinha, frango com bacon, coxa e sobrecoxa, panceta, coraçãozinho e kafta.",
      "Alcatra e Ancho.",
    ],
  },
  {
    emoji: "🍽️",
    title: "Almoço",
    items: [
      "Arroz, feijão, mandioca na manteiga, milho na manteiga, maionese, soja com molho de tomate, vinagrete, farofa de milho e farofa de mandioca.",
      "10L de Coca Zero.",
    ],
  },
  {
    emoji: "🍫",
    title: "Sobremesa",
    items: ["Brigadeiro de Colher."],
  },
];

export default function CardapioPage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold">Cardápio</h1>
          <p className="text-sm text-zinc-500 mt-1">O que vai rolar no churras 🍖</p>
        </div>

        <div className="flex flex-col gap-4">
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="card">
              <h2 className="text-base font-bold text-green mb-2 flex items-center gap-2">
                <span>{sec.emoji}</span> {sec.title}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {sec.items.map((item, i) => (
                  <li key={i} className="text-sm text-foreground flex gap-2">
                    <span className="text-green/60 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
