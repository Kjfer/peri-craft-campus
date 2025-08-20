import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Eye, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Certificate {
  id: string;
  certificate_code: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  is_valid: boolean;
  certificate_url?: string;
  course?: {
    title: string;
  };
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function CertificateManagement() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('certificates')
        .select(`
          *,
          courses!inner(title)
        `)
        .order('issued_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('certificate_code', `%${searchTerm}%`);
      }

      const { data: certificatesData, error } = await query;

      if (error) {
        throw error;
      }

      // Obtener información de usuarios por separado
      if (certificatesData && certificatesData.length > 0) {
        const userIds = certificatesData.map(cert => cert.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);

        // Combinar los datos
        const enrichedCertificates = certificatesData.map(cert => ({
          ...cert,
          profiles: profilesData?.find(profile => profile.user_id === cert.user_id)
        }));

        setCertificates(enrichedCertificates);
      } else {
        setCertificates([]);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los certificados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCertificateValidity = async (certificateId: string, currentValidity: boolean) => {
    try {
      const { error } = await supabase
        .from('certificates')
        .update({ is_valid: !currentValidity })
        .eq('id', certificateId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Certificado ${!currentValidity ? 'activado' : 'desactivado'} correctamente`
      });
      
      fetchCertificates();
    } catch (error) {
      console.error('Error updating certificate:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el certificado",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, [searchTerm]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Certificados</h1>
            <p className="text-muted-foreground">
              Administra todos los certificados emitidos en la plataforma
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Certificados</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{certificates.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificados Válidos</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {certificates.filter(cert => cert.is_valid).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {certificates.filter(cert => 
                  new Date(cert.issued_at).getMonth() === new Date().getMonth() &&
                  new Date(cert.issued_at).getFullYear() === new Date().getFullYear()
                ).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, estudiante o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de certificados */}
        <Card>
          <CardHeader>
            <CardTitle>Certificados Emitidos</CardTitle>
            <CardDescription>
              Lista de todos los certificados generados en la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Fecha de Emisión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((certificate) => (
                  <TableRow key={certificate.id}>
                    <TableCell>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {certificate.certificate_code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {certificate.profiles?.full_name || 'Usuario sin nombre'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {certificate.profiles?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {certificate.course?.title || 'Curso no encontrado'}
                    </TableCell>
                    <TableCell>
                      {new Date(certificate.issued_at).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={certificate.is_valid ? "default" : "destructive"}>
                        {certificate.is_valid ? "Válido" : "Inválido"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {certificate.certificate_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(certificate.certificate_url, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        )}
                        <Button
                          variant={certificate.is_valid ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleCertificateValidity(certificate.id, certificate.is_valid)}
                        >
                          {certificate.is_valid ? "Invalidar" : "Validar"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {certificates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No se encontraron certificados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}