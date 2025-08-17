import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import CourseContentGuard from "@/components/course/CourseContentGuard";
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
  X,
  Lock,
  CheckCircle,
  Play,
  GraduationCap
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
  payment_status: string;
  courses: {
    id: string;
    title: string;
    description: string;
    thumbnail_url?: string;
    instructor_name: string;
    duration_hours: number;
    category: string;
    level: string;
    price: number;
    is_free: boolean;
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
  const navigate = useNavigate();
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
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        // Set user profile from auth context
        if (profile) {
          setUserProfile({
            id: profile.id,
            full_name: profile.full_name || '',
            email: profile.email || '',
            avatar_url: profile.avatar_url || undefined,
            phone: profile.phone || undefined,
            country: profile.country || undefined,
            role: profile.role || 'student',
            created_at: profile.created_at || ''
          });

          setEditedProfile({
            full_name: profile.full_name || '',
            phone: profile.phone || '',
            country: profile.country || ''
          });
        }

        // Fetch only PAID enrollments (courses the user has purchased)
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select(`
            *,
            courses!inner (
              id,
              title,
              description,
              thumbnail_url,
              instructor_name,
              duration_hours,
              category,
              level,
              price,
              is_free
            ),
            orders!inner (
              payment_status
            )
          `)
          .eq('user_id', user.id)
          .or('orders.payment_status.eq.completed,courses.is_free.eq.true,courses.price.eq.0');

        if (enrollmentsError) {
          console.error('Error fetching enrollments:', enrollmentsError);
        } else {
          // Filter to ensure only paid/free courses are shown
          const validEnrollments = (enrollmentsData || []).filter((enrollment: any) => {
            return enrollment.orders?.payment_status === 'completed' || 
                   enrollment.courses?.is_free === true || 
                   enrollment.courses?.price === 0;
          });
          setEnrollments(validEnrollments);

          // Calculate progress stats
          if (validEnrollments.length > 0) {
            const completedCourses = validEnrollments.filter((e: any) => e.progress_percentage === 100).length;
            const averageProgress = validEnrollments.reduce((sum: number, e: any) => sum + e.progress_percentage, 0) / validEnrollments.length;
            
            setProgressStats({
              total_enrollments: validEnrollments.length,
              completed_courses: completedCourses,
              average_progress: Math.round(averageProgress),
              completion_rate: validEnrollments.length > 0 ? Math.round((completedCourses / validEnrollments.length) * 100) : 0
            });
          } else {
            setProgressStats({
              total_enrollments: 0,
              completed_courses: 0,
              average_progress: 0,
              completion_rate: 0
            });
          }
        }

        // Fetch certificates for completed courses
        const { data: certificatesData, error: certificatesError } = await supabase
          .from('certificates')
          .select(`
            *,
            courses (
              id,
              title,
              instructor_name,
              duration_hours
            )
          `)
          .eq('user_id', user.id);

        if (certificatesError) {
          console.error('Error fetching certificates:', certificatesError);
        } else {
          setCertificates(certificatesData || []);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del dashboard",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, profile, toast]);

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editedProfile)
        .eq('id', user?.id);

      if (error) throw error;
      
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

  const handleCourseClick = (courseId: string) => {
    navigate(`/courses/${courseId}/lessons`);
  };

  if (loading || isLoading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse bg-gradient-to-r from-blue-600 to-purple-600 w-16 h-16 rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={userProfile.avatar_url} />
            <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg">
              {getInitials(userProfile.full_name || userProfile.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">¡Hola, {userProfile.full_name || 'Estudiante'}!</h1>
            <p className="text-muted-foreground">Bienvenido de vuelta a tu dashboard de aprendizaje</p>
            <Badge variant="outline" className="mt-1 capitalize">
              {userProfile.role}
            </Badge>
          </div>
        </div>
        
        <div className="mt-4 lg:mt-0">
          <Button 
            variant="outline" 
            onClick={() => setEditingProfile(true)}
            className="w-full lg:w-auto"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Perfil
          </Button>
        </div>
      </div>

      {/* Progress Stats */}
      {progressStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cursos Inscritos</CardTitle>
              <BookOpen className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressStats.total_enrollments}</div>
              <p className="text-xs text-muted-foreground">
                Cursos pagados activos
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completados</CardTitle>
              <Award className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressStats.completed_courses}</div>
              <p className="text-xs text-muted-foreground">
                Cursos finalizados
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressStats.average_progress}%</div>
              <Progress value={progressStats.average_progress} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Finalización</CardTitle>
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressStats.completion_rate}%</div>
              <p className="text-xs text-muted-foreground">
                Cursos terminados vs iniciados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="courses">Mis Cursos</TabsTrigger>
          <TabsTrigger value="certificates">Certificados</TabsTrigger>
          <TabsTrigger value="profile">Mi Perfil</TabsTrigger>
        </TabsList>

        {/* My Courses Tab */}
        <TabsContent value="courses" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Mis Cursos Pagados</h2>
            <Button onClick={() => navigate('/courses')}>
              <BookOpen className="w-4 h-4 mr-2" />
              Explorar Cursos
            </Button>
          </div>

          {enrollments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No tienes cursos pagados aún</h3>
                <p className="text-muted-foreground mb-6">
                  Explora nuestro catálogo y encuentra el curso perfecto para ti
                </p>
                <Button onClick={() => navigate('/courses')}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Ver Cursos Disponibles
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((enrollment) => (
                <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={enrollment.courses.thumbnail_url || '/placeholder.svg'}
                      alt={enrollment.courses.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant={enrollment.progress_percentage === 100 ? "default" : "secondary"}>
                        {enrollment.progress_percentage === 100 ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Completado
                          </>
                        ) : (
                          `${enrollment.progress_percentage}%`
                        )}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{enrollment.courses.title}</CardTitle>
                    <CardDescription className="flex items-center text-sm">
                      <User className="w-4 h-4 mr-1" />
                      {enrollment.courses.instructor_name}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {enrollment.courses.duration_hours}h
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(enrollment.enrolled_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <Progress value={enrollment.progress_percentage} className="w-full" />
                    
                    <Button 
                      className="w-full" 
                      onClick={() => handleCourseClick(enrollment.courses.id)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {enrollment.progress_percentage === 0 ? 'Comenzar' : 'Continuar'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-6">
          <h2 className="text-2xl font-bold">Mis Certificados</h2>
          
          {certificates.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Award className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No tienes certificados aún</h3>
                <p className="text-muted-foreground">
                  Completa un curso para obtener tu primer certificado
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((certificate) => (
                <Card key={certificate.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Award className="w-5 h-5 mr-2 text-yellow-500" />
                      Certificado
                    </CardTitle>
                    <CardDescription>{certificate.courses.title}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p>Instructor: {certificate.courses.instructor_name}</p>
                      <p>Duración: {certificate.courses.duration_hours} horas</p>
                      <p>Código: {certificate.certificate_code}</p>
                      <p>Emitido: {new Date(certificate.issued_at).toLocaleDateString()}</p>
                    </div>
                    
                    <Button className="w-full" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Descargar Certificado
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Información Personal
                {!editingProfile && (
                  <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {editingProfile ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input
                      id="full_name"
                      value={editedProfile.full_name}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, full_name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <Input
                      id="country"
                      value={editedProfile.country}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, country: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button onClick={handleUpdateProfile}>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                    <Button variant="outline" onClick={() => setEditingProfile(false)}>
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="mt-1">{userProfile.email}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Nombre Completo</Label>
                      <p className="mt-1">{userProfile.full_name || 'No especificado'}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Teléfono</Label>
                      <p className="mt-1">{userProfile.phone || 'No especificado'}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">País</Label>
                      <p className="mt-1">{userProfile.country || 'No especificado'}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Rol</Label>
                      <p className="mt-1 capitalize">{userProfile.role}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Miembro desde</Label>
                      <p className="mt-1">{new Date(userProfile.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
