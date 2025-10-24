import { Shield } from "lucide-react";

export default function VerifyCertificate() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Verificación de Certificados
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Esta función estará disponible próximamente
          </p>
          <div className="mt-12 p-8 bg-card rounded-lg border shadow-sm">
            <h2 className="text-2xl font-semibold mb-4">Próximamente</h2>
            <p className="text-muted-foreground mb-6">
              Estamos trabajando en esta funcionalidad para brindarte la mejor experiencia.
              Pronto podrás verificar la autenticidad de los certificados emitidos por nuestra plataforma.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Volver al inicio
              </a>
              <a
                href="/cursos"
                className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Ver cursos
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
