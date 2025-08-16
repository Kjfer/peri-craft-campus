import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiCall, API_CONFIG } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  BookOpen, 
  Award, 
  TrendingUp, 
  CreditCard,
  Calendar,
  Clock,
  Download,
  Edit,
  Save,
  X
} from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  country?: string;
  role: string;
  created_at: string;
}

interface Enrollment {
  id: string;
  progress_percentage: number;
  enrolled_at: string;
  completed_at?: string;
  courses: {
    id: string;
    title: string;
    description: string;
    thumbnail_url?: string;
    instructor_name: string;
    duration_hours: number;
    category: string;
    level: string;
  };
}

interface Certificate {
  id: string;
  certificate_code: string;
  certificate_url?: string;
  issued_at: string;
  courses: {
    id: string;
    title: string;
    instructor_name: string;
    duration_hours: number;
  };
}

interface ProgressStats {
  total_enrollments: number;
  completed_courses: number;
  average_progress: number;
  completion_rate: number;
}

export default function Dashboard() {
  const { user, profile, loading, refreshAuth } = useAuth();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    full_name: '',
    phone: '',
    country: ''
  });

  useEffect(() => {
    if (profile) {
      // Use the profile data from useAuth hook
      setUserProfile({
        id: profile.id,
        full_name: profile.full_name || '',
        email: profile.email || '',
        avatar_url: profile.avatar_url || undefined,
        phone: profile.phone || undefined,
        country: profile.country || undefined,
        role: profile.role || 'student',
        created_at: profile.created_at || new Date().toISOString()
      });
      
      setEditedProfile({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        country: profile.country || ''
      });
      
      // Fetch additional user data (enrollments, certificates, etc.)
      const fetchAdditionalUserData = async () => {
        try {
          setIsLoading(true);
          
          // Only fetch data that's not available in the profile
          // For now, we'll set empty arrays since the backend endpoints might not be fully implemented
          setEnrollments([]);
          setCertificates([]);
          setProgressStats({
            total_enrollments: 0,
            completed_courses: 0,
            average_progress: 0,
            completion_rate: 0
          });
          
        } catch (error) {
          console.error('Error fetching additional user data:', error);
          toast({
            title: "Error",
            description: "No se pudieron cargar algunos datos del perfil.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchAdditionalUserData();
    }
  }, [profile, toast]);

  const handleUpdateProfile = async () => {
    try {
      const response = await apiCall(API_CONFIG.ENDPOINTS.USERS.PROFILE, {
        method: 'PUT',
        body: JSON.stringify(editedProfile)
      });
      
      // Update local state
      setUserProfile(prev => prev ? { ...prev, ...editedProfile } : null);
      setEditingProfile(false);
      
      // Refresh authentication context to get updated profile
      if (refreshAuth) {
        await refreshAuth();
      }
      
      toast({
        title: "Perfil actualizado",
        description: "Tu información ha sido actualizada exitosamente.",
      });
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading || isLoading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse gradient-primary w-16 h-16 rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header del perfil */}
        <Card className="mb-8 shadow-elegant">
          <CardHeader>
            <div className="flex items-start gap-6">
              <Avatar className="w-20 h-20">
                <AvatarImage src={userProfile?.avatar_url} />
                <AvatarFallback className="gradient-primary text-white text-xl">
                  {userProfile?.full_name ? getInitials(userProfile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{userProfile?.full_name}</h1>
                  <Badge variant="secondary" className="capitalize">
                    {userProfile?.role}
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-4">{userProfile?.email}</p>
                
                {progressStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{progressStats.total_enrollments}</div>
                      <div className="text-sm text-muted-foreground">Cursos Inscritos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-secondary">{progressStats.completed_courses}</div>
                      <div className="text-sm text-muted-foreground">Completados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">{progressStats.average_progress}%</div>
                      <div className="text-sm text-muted-foreground">Progreso Promedio</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">{progressStats.completion_rate}%</div>
                      <div className="text-sm text-muted-foreground">Tasa de Finalización</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Contenido principal con tabs */}
        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Mis Cursos
            </TabsTrigger>
            <TabsTrigger value="certificates" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Certificados
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Progreso
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
          </TabsList>

          {/* Tab: Mis Cursos */}
          <TabsContent value="courses">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment) => (
                <Card key={enrollment.id} className="shadow-elegant hover:shadow-glow transition-shadow">
                  <div className="relative">
                    {enrollment.courses.thumbnail_url && (
                      <img 
                        src={enrollment.courses.thumbnail_url} 
                        alt={enrollment.courses.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    )}
                    <div className="absolute top-4 right-4">
                      <Badge variant={enrollment.completed_at ? "default" : "secondary"}>
                        {enrollment.completed_at ? "Completado" : `${enrollment.progress_percentage}%`}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="text-lg">{enrollment.courses.title}</CardTitle>
                    <CardDescription>{enrollment.courses.instructor_name}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <Progress value={enrollment.progress_percentage} className="w-full" />
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {enrollment.courses.duration_hours}h
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(enrollment.enrolled_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <Button variant="outline" className="w-full">
                        Continuar Curso
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {enrollments.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No tienes cursos inscritos</h3>
                    <p className="text-muted-foreground mb-4">Explora nuestro catálogo y comienza tu aprendizaje</p>
                    <Button>Explorar Cursos</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab: Certificados */}
          <TabsContent value="certificates">
            <div className="grid gap-6 md:grid-cols-2">
              {certificates.map((certificate) => (
                <Card key={certificate.id} className="shadow-elegant">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Award className="h-8 w-8 text-yellow-500" />
                      <Badge>{certificate.certificate_code}</Badge>
                    </div>
                    <CardTitle className="text-lg">{certificate.courses.title}</CardTitle>
                    <CardDescription>
                      Instructor: {certificate.courses.instructor_name}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Fecha de emisión:</span>
                        <span>{new Date(certificate.issued_at).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Duración del curso:</span>
                        <span>{certificate.courses.duration_hours} horas</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Descargar
                        </Button>
                        <Button variant="outline" size="sm">
                          Verificar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {certificates.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="text-center py-12">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No tienes certificados</h3>
                    <p className="text-muted-foreground">Completa tus cursos para obtener certificados</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab: Progreso */}
          <TabsContent value="progress">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Estadísticas de Aprendizaje
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progressStats ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Progreso General</span>
                          <span className="text-sm text-muted-foreground">{progressStats.average_progress}%</span>
                        </div>
                        <Progress value={progressStats.average_progress} />
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Tasa de Finalización</span>
                          <span className="text-sm text-muted-foreground">{progressStats.completion_rate}%</span>
                        </div>
                        <Progress value={progressStats.completion_rate} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{progressStats.total_enrollments}</div>
                        <div className="text-sm text-muted-foreground">Cursos Totales</div>
                      </div>
                      
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-secondary">{progressStats.completed_courses}</div>
                        <div className="text-sm text-muted-foreground">Cursos Completados</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay estadísticas disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Perfil */}
          <TabsContent value="profile">
            <Card className="shadow-elegant">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información Personal
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editingProfile ? setEditingProfile(false) : setEditingProfile(true)}
                  >
                    {editingProfile ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    {editingProfile ? 'Cancelar' : 'Editar'}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nombre Completo</Label>
                      {editingProfile ? (
                        <Input
                          id="full_name"
                          value={editedProfile.full_name}
                          onChange={(e) => setEditedProfile({...editedProfile, full_name: e.target.value})}
                        />
                      ) : (
                        <p className="text-sm">{userProfile?.full_name || 'No especificado'}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      {editingProfile ? (
                        <Input
                          id="phone"
                          value={editedProfile.phone}
                          onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
                          placeholder="Tu número de teléfono"
                        />
                      ) : (
                        <p className="text-sm">{userProfile?.phone || 'No especificado'}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">País</Label>
                      {editingProfile ? (
                        <Input
                          id="country"
                          value={editedProfile.country}
                          onChange={(e) => setEditedProfile({...editedProfile, country: e.target.value})}
                          placeholder="Tu país"
                        />
                      ) : (
                        <p className="text-sm">{userProfile?.country || 'No especificado'}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Rol</Label>
                      <Badge variant="secondary" className="capitalize">
                        {userProfile?.role}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Miembro desde</Label>
                      <p className="text-sm">
                        {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  {editingProfile && (
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleUpdateProfile} className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        Guardar Cambios
                      </Button>
                      <Button variant="outline" onClick={() => setEditingProfile(false)}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}