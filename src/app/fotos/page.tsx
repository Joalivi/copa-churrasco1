import { PageContainer } from "@/components/layout/page-container";
import { PhotoGallery } from "@/components/gallery/photo-gallery";

export const metadata = {
  title: "Fotos da Chacara | Churras da Copa 2026",
  description: "Fotos do Sitio Sao Jose em Caldas/MG onde sera o churras da Copa 2026.",
};

export default function FotosPage() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="text-center space-y-2 animate-slide-up">
          <span className="text-4xl" role="img" aria-label="Camera">
            &#128247;
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Fotos da Chacara
          </h1>
          <p className="text-foreground/60 text-sm">
            Sitio Sao Jose &mdash; Caldas/MG
          </p>
        </div>

        <PhotoGallery />
      </div>
    </PageContainer>
  );
}
