import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, FileText, DollarSign } from "lucide-react";

export default function AdminDashboard() {
  const stats = [
    {
      title: "Total de Cursos",
      value: "24",
      description: "Cursos activos en la plataforma",
      icon: BookOpen,
      color: "text-blue-600"
    },
    {
      title: "Estudiantes Activos",
      value: "1,234",
      description: "Usuarios registrados",
      icon: Users,
      color: "text-green-600"
    },
    {
      title: "Certificados Emitidos",
      value: "456",
      description: "Este mes",
      icon: FileText,
      color: "text-purple-600"
    },
    {
      title: "Ingresos del Mes",
      value: "$12,345",
      description: "Total facturado",
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
          {stats.map((stat) => (
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
                {[
                  { action: "Nuevo curso publicado: 'Diseño de Vestidos'", time: "Hace 2 horas" },
                  { action: "Usuario María García completó curso", time: "Hace 4 horas" },
                  { action: "Certificado emitido #PERI-ABC123", time: "Hace 6 horas" },
                  { action: "Nueva inscripción recibida", time: "Hace 8 horas" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cursos Populares</CardTitle>
              <CardDescription>
                Los más vistos esta semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Patronaje Básico", enrollments: "45 inscripciones" },
                  { title: "Diseño de Vestidos", enrollments: "38 inscripciones" },
                  { title: "Confección Avanzada", enrollments: "32 inscripciones" },
                  { title: "Textiles y Telas", enrollments: "28 inscripciones" }
                ].map((course, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{course.title}</p>
                      <p className="text-xs text-muted-foreground">{course.enrollments}</p>
                    </div>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${80 - index * 15}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}