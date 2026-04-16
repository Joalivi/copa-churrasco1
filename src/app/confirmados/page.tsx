import { PageContainer } from "@/components/layout/page-container";
import { AttendeeGrid } from "@/components/attendees/attendee-grid";

export const metadata = {
  title: "Confirmados | Churras da Copa 2026",
  description: "Veja quem ja confirmou presenca no churrasco da Copa 2026.",
};

export default function ConfirmadosPage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 animate-slide-up">
          <span className="text-4xl" role="img" aria-label="Festa">
            &#127881;
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Quem vai?
          </h1>
          <p className="text-foreground/60 text-sm">
            Lista atualizada em tempo real dos confirmados no churras.
          </p>
        </div>

        {/* Grid de confirmados */}
        <AttendeeGrid />
      </div>
    </PageContainer>
  );
}
