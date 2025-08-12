import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  Award, 
  Calendar,
  User,
  BookOpen,
  Shield,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Certificate {
  id: string;
  certificate_code: string;
  issued_at: string;
  is_valid: boolean;
  certificate_url?: string;
  course: {
    title: string;
    instructor_name: string;
    duration_hours: number;
  };
  profile: {
    full_name: string;
  };
}

export default function VerifyCertificate() {
  const [certificateCode, setCertificateCode] = useState("");
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!certificateCode.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un código de certificado.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSearched(true);
    setCertificate(null);

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          courses:course_id (
            title,
            instructor_name,
            duration_hours
          ),
          profiles:user_id (
            full_name
          )
        `)
        .eq('certificate_code', certificateCode.trim().toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found
          setCertificate(null);
        } else {
          throw error;
        }
      } else if (data) {
        setCertificate({
          ...data,
          course: data.courses as any,
          profile: data.profiles as any
        });
      }
    } catch (error) {
      console.error('Error verifying certificate:', error);
      toast({
        title: "Error",
        description: "Error al verificar el certificado. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-6">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Verificar Certificado
            </h1>
            <p className="text-xl opacity-90 mb-8">
              Valida la autenticidad de cualquier certificado emitido por Peri Institute 
              ingresando el código de verificación único.
            </p>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 bg-gradient-to-br from-background to-muted/50 shadow-elegant">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Buscar Certificado</CardTitle>
                <CardDescription>
                  Ingresa el código de certificado para verificar su autenticidad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="certificate-code">Código de Certificado</Label>
                    <div className="relative">
                      <Input
                        id="certificate-code"
                        value={certificateCode}
                        onChange={(e) => setCertificateCode(e.target.value)}
                        placeholder="PERI-XXXXXXXX"
                        className="text-center text-lg font-mono tracking-wider"
                        maxLength={13}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      El código tiene el formato: PERI-XXXXXXXX
                    </p>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2"></div>
                        Verificando...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Search className="w-4 h-4 mr-2" />
                        Verificar Certificado
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Results Section */}
      {searched && (
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {certificate ? (
                <Card className="border-0 bg-gradient-to-br from-background to-muted/50 shadow-elegant">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl text-green-600">
                      Certificado Válido
                    </CardTitle>
                    <CardDescription>
                      Este certificado ha sido verificado exitosamente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            ESTUDIANTE
                          </Label>
                          <div className="flex items-center mt-1">
                            <User className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="font-medium">{certificate.profile.full_name}</span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            CURSO
                          </Label>
                          <div className="flex items-start mt-1">
                            <BookOpen className="w-4 h-4 mr-2 text-muted-foreground mt-0.5" />
                            <div>
                              <div className="font-medium">{certificate.course.title}</div>
                              <div className="text-sm text-muted-foreground">
                                Instructor: {certificate.course.instructor_name}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            DURACIÓN
                          </Label>
                          <p className="mt-1">{certificate.course.duration_hours} horas académicas</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            FECHA DE EMISIÓN
                          </Label>
                          <div className="flex items-center mt-1">
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span>{formatDate(certificate.issued_at)}</span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            CÓDIGO DE VERIFICACIÓN
                          </Label>
                          <div className="flex items-center mt-1">
                            <Award className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="font-mono">{certificate.certificate_code}</span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            ESTADO
                          </Label>
                          <div className="mt-1">
                            <Badge 
                              variant={certificate.is_valid ? "default" : "destructive"}
                              className="flex items-center w-fit"
                            >
                              {certificate.is_valid ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              {certificate.is_valid ? 'Válido' : 'Revocado'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="text-center space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Este certificado ha sido emitido por Peri Institute y puede ser verificado 
                        en cualquier momento usando el código de verificación único.
                      </p>
                      
                      {certificate.certificate_url && (
                        <Button variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Descargar Certificado
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 bg-gradient-to-br from-background to-muted/50 shadow-elegant">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
                      <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl text-red-600">
                      Certificado No Encontrado
                    </CardTitle>
                    <CardDescription>
                      El código ingresado no corresponde a ningún certificado válido
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      Verifica que el código esté escrito correctamente. 
                      Debe tener el formato PERI-XXXXXXXX.
                    </p>
                    
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Posibles causas:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1 text-left">
                        <li>• El código fue ingresado incorrectamente</li>
                        <li>• El certificado no existe en nuestro sistema</li>
                        <li>• El certificado ha sido revocado</li>
                        <li>• Error tipográfico en el código</li>
                      </ul>
                    </div>

                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCertificateCode("");
                        setSearched(false);
                        setCertificate(null);
                      }}
                    >
                      Intentar de nuevo
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Info Section */}
      {!searched && (
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="border-0 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-semibold">¿Cómo funciona la verificación?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                      <div className="space-y-2">
                        <div className="w-8 h-8 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-bold text-primary">1</span>
                        </div>
                        <p className="font-medium">Ingresa el código</p>
                        <p className="text-muted-foreground">
                          Escribe el código de 8 caracteres que aparece en el certificado
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="w-8 h-8 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-bold text-primary">2</span>
                        </div>
                        <p className="font-medium">Verificación automática</p>
                        <p className="text-muted-foreground">
                          Nuestro sistema verifica la autenticidad en tiempo real
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="w-8 h-8 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-bold text-primary">3</span>
                        </div>
                        <p className="font-medium">Resultado instantáneo</p>
                        <p className="text-muted-foreground">
                          Obtienes toda la información del certificado al instante
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}