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
  Play,
  ShoppingBag
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
  course: {
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

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  payment_status: string;
  payment_method?: string;
  created_at: string;
  order_items: {
    course: {
      id: string;
      title: string;
      instructor_name: string;
    };
    price: number;
  }[];
}

interface Certificate {
  id: string;
  certificate_code: string;
  certificate_url?: string;
  issued_at: string;
  course: {
    id: string;
    title: string;
    instructor_name: string;
    duration_hours: number;
  };
}

export default function DashboardEnhanced() {
  const { user, profile, loading, refreshAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    full_name: '',
    phone: '',
    country: ''
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch user profile
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

      // Fetch enrollments with course details
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false });

      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError);
      } else {
        setEnrollments(enrollmentsData || []);
      }

      // Fetch orders with items
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            course:courses(id, title, instructor_name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      } else {
        setOrders(ordersData || []);
      }

      // Fetch certificates
      const { data: certificatesData, error: certificatesError } = await supabase
        .from('certificates')
        .select(`
          *,
          course:courses(id, title, instructor_name, duration_hours)
        `)
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

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

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editedProfile)
        .eq('user_id', user!.id);

      if (error) throw error;
      
      setUserProfile(prev => prev ? { ...prev, ...editedProfile } : null);
      setEditingProfile(false);
      
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

  const calculateOverallProgress = () => {
    if (enrollments.length === 0) return 0;
    const totalProgress = enrollments.reduce((acc, enrollment) => acc + enrollment.progress_percentage, 0);
    return Math.round(totalProgress / enrollments.length);
  };

  const getCompletedCourses = () => {
    return enrollments.filter(enrollment => enrollment.completed_at).length;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse gradient-primary w-16 h-16 rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar perfil</h3>
          <p className="text-muted-foreground mb-4">
            No se pudo cargar la información del usuario.
          </p>
          <Button onClick={() => window.location.reload()}>
            Intentar de nuevo
          </Button>
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
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{enrollments.length}</div>
                    <div className="text-sm text-muted-foreground">Cursos Inscritos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary">{getCompletedCourses()}</div>
                    <div className="text-sm text-muted-foreground">Completados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">{calculateOverallProgress()}%</div>
                    <div className="text-sm text-muted-foreground">Progreso Promedio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-destructive">{certificates.length}</div>
                    <div className="text-sm text-muted-foreground">Certificados</div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Contenido principal con tabs */}
        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Mis Cursos
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Compras
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
                    {enrollment.course.thumbnail_url && (
                      <img 
                        src={enrollment.course.thumbnail_url} 
                        alt={enrollment.course.title}
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
                    <CardTitle className="text-lg line-clamp-2">{enrollment.course.title}</CardTitle>
                    <CardDescription>{enrollment.course.instructor_name}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <Progress value={enrollment.progress_percentage} className="w-full" />
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {enrollment.course.duration_hours}h
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(enrollment.enrolled_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full gap-2"
                        onClick={() => navigate(`/learn/${enrollment.course.id}`)}
                      >
                        <Play className="h-4 w-4" />
                        {enrollment.progress_percentage > 0 ? 'Continuar Curso' : 'Comenzar Curso'}
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
                    <Button onClick={() => navigate('/cursos')}>Explorar Cursos</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab: Compras */}
          <TabsContent value="orders">
            <div className="space-y-6">
              {orders.map((order) => (
                <Card key={order.id} className="shadow-elegant">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">Orden #{order.order_number}</CardTitle>
                        <CardDescription>
                          {new Date(order.created_at).toLocaleDateString()} • 
                          {order.payment_method && ` ${order.payment_method}`}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={
                            order.payment_status === 'completed' ? 'default' :
                            order.payment_status === 'pending' ? 'secondary' : 'destructive'
                          }
                        >
                          {order.payment_status === 'completed' ? 'Pagado' :
                           order.payment_status === 'pending' ? 'Pendiente' : 'Fallido'}
                        </Badge>
                        <div className="text-lg font-bold mt-1">
                          ${order.total_amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <h4 className="font-medium">Cursos comprados:</h4>
                      {order.order_items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <div>
                            <div className="font-medium">{item.course.title}</div>
                            <div className="text-sm text-muted-foreground">
                              Por {item.course.instructor_name}
                            </div>
                          </div>
                          <div className="font-medium">
                            ${item.price.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {orders.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No tienes compras registradas</h3>
                    <p className="text-muted-foreground">Tus compras aparecerán aquí una vez que realices un pago</p>
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
                    <CardTitle className="text-lg">{certificate.course.title}</CardTitle>
                    <CardDescription>
                      Instructor: {certificate.course.instructor_name}
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
                        <span>{certificate.course.duration_hours} horas</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Descargar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/verificar-certificado?code=${certificate.certificate_code}`)}
                        >
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
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Progreso General</span>
                        <span className="text-sm text-muted-foreground">{calculateOverallProgress()}%</span>
                      </div>
                      <Progress value={calculateOverallProgress()} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Tasa de Finalización</span>
                        <span className="text-sm text-muted-foreground">
                          {enrollments.length > 0 ? Math.round((getCompletedCourses() / enrollments.length) * 100) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={enrollments.length > 0 ? (getCompletedCourses() / enrollments.length) * 100 : 0} 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{enrollments.length}</div>
                      <div className="text-sm text-muted-foreground">Cursos Totales</div>
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-secondary">{getCompletedCourses()}</div>
                      <div className="text-sm text-muted-foreground">Cursos Completados</div>
                    </div>
                  </div>
                </div>
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
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, full_name: e.target.value }))}
                        />
                      ) : (
                        <div className="p-2 bg-muted/50 rounded">{userProfile.full_name}</div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <div className="p-2 bg-muted/50 rounded text-muted-foreground">
                        {userProfile.email} (No editable)
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      {editingProfile ? (
                        <Input
                          id="phone"
                          value={editedProfile.phone}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Ej: +51 999 999 999"
                        />
                      ) : (
                        <div className="p-2 bg-muted/50 rounded">{userProfile.phone || 'No especificado'}</div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">País</Label>
                      {editingProfile ? (
                        <Input
                          id="country"
                          value={editedProfile.country}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, country: e.target.value }))}
                          placeholder="Ej: Perú"
                        />
                      ) : (
                        <div className="p-2 bg-muted/50 rounded">{userProfile.country || 'No especificado'}</div>
                      )}
                    </div>
                  </div>
                  
                  {editingProfile && (
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateProfile}>
                        <Save className="h-4 w-4 mr-2" />
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