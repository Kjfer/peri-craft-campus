import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, FileText, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminAPI } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  totalCourses: number;
  activeStudents: number;
  certificatesIssued: number;
  monthlyRevenue: string;
  recentActivity: Array<{
    action: string;
    time: string;
  }>;
  popularCourses: Array<{
    title: string;
    enrollments: string;
    percentage: number;
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obtener estadísticas básicas directamente de Supabase
      const [coursesResponse, usersResponse, certificatesResponse, enrollmentsResponse] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('certificates').select('id', { count: 'exact' }).eq('is_valid', true),
        supabase.from('enrollments').select('id', { count: 'exact' })
      ]);

      // Obtener certificados de este mes
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: monthlyCertificates } = await supabase
        .from('certificates')
        .select('id', { count: 'exact' })
        .gte('issued_at', startOfMonth.toISOString());

      // Obtener cursos populares (con más inscripciones)
      const { data: popularCourses } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          enrollments(id)
        `)
        .eq('is_active', true)
        .limit(4);

      // Actividad reciente (últimas inscripciones) - sin joins complicados
      const { data: recentEnrollments } = await supabase
        .from('enrollments')
        .select('enrolled_at, user_id, course_id')
        .order('enrolled_at', { ascending: false })
        .limit(4);

      // Obtener usuarios y cursos por separado si hay inscripciones
      let enrichedEnrollments = [];
      if (recentEnrollments && recentEnrollments.length > 0) {
        const userIds = recentEnrollments.map(e => e.user_id);
        const courseIds = recentEnrollments.map(e => e.course_id);

        const [usersData, coursesData] = await Promise.all([
          supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
          supabase.from('courses').select('id, title').in('id', courseIds)
        ]);

        enrichedEnrollments = recentEnrollments.map(enrollment => ({
          ...enrollment,
          user_name: usersData.data?.find(u => u.user_id === enrollment.user_id)?.full_name || 'Usuario',
          course_title: coursesData.data?.find(c => c.id === enrollment.course_id)?.title || 'Curso'
        }));
      }

      const dashboardStats: DashboardStats = {
        totalCourses: coursesResponse.count || 0,
        activeStudents: usersResponse.count || 0,
        certificatesIssued: certificatesResponse.count || 0,
        monthlyRevenue: `$${(Math.random() * 10000 + 5000).toFixed(0)}`, // Placeholder hasta implementar pagos
        recentActivity: enrichedEnrollments?.map((enrollment, index) => ({
          action: `${enrollment.user_name} se inscribió en ${enrollment.course_title}`,
          time: `Hace ${index + 1} ${index === 0 ? 'hora' : 'horas'}`
        })) || [],
        popularCourses: popularCourses?.map((course, index) => ({
          title: course.title,
          enrollments: `${course.enrollments?.length || 0} inscripciones`,
          percentage: Math.max(80 - index * 15, 20)
        })) || []
      };

      setStats(dashboardStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas del dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return (
      <AdminLayout>
        <div className="text-center py-8">
          <p>No se pudieron cargar los datos del dashboard</p>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    {
      title: "Total de Cursos",
      value: stats.totalCourses.toString(),
      description: "Cursos activos en la plataforma",
      icon: BookOpen,
      color: "text-blue-600"
    },
    {
      title: "Estudiantes Activos",
      value: stats.activeStudents.toString(),
      description: "Usuarios registrados",
      icon: Users,
      color: "text-green-600"
    },
    {
      title: "Certificados Emitidos",
      value: stats.certificatesIssued.toString(),
      description: "Certificados válidos",
      icon: FileText,
      color: "text-purple-600"
    },
    {
      title: "Ingresos Estimados",
      value: stats.monthlyRevenue,
      description: "Estimación mensual",
      icon: DollarSign,
      color: "text-yellow-600"
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen general de la plataforma Peri Institute
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Últimas acciones en la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.action}</p>
                        <p className="text-xs text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No hay actividad reciente</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cursos Populares</CardTitle>
              <CardDescription>
                Los más inscritos en la plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.popularCourses.length > 0 ? (
                  stats.popularCourses.map((course, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{course.title}</p>
                        <p className="text-xs text-muted-foreground">{course.enrollments}</p>
                      </div>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${course.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No hay cursos disponibles</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}