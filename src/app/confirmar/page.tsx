import { PageContainer } from "@/components/layout/page-container";
import { CheckinForm } from "@/components/attendees/checkin-form";

export const metadata = {
  title: "Confirmar Presenca | Churras da Copa 2026",
  description: "Confirme sua presenca no churrasco da Copa do Mundo 2026.",
};

export default function ConfirmarPage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-4xl" role="img" aria-label="Churrasco">
            &#127830;
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Churras da Copa 2026
          </h1>
          <p className="text-foreground/60 text-sm">
            Preencha seus dados para confirmar presenca no churrasco.
          </p>
        </div>

        {/* Formulario de check-in */}
        <CheckinForm />

        {/* Info adicional */}
        <div className="text-center text-xs text-foreground/40 space-y-1">
          <p>Seus dados serao usados apenas para organizar o evento.</p>
          <p>
            Duvidas?{" "}
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-green"
            >
              Fale conosco
            </a>
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
