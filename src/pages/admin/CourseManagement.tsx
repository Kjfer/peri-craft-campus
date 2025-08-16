import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { adminAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Course {
  id: string;
  title: string;
  category: string;
  level: string;
  price: number;
  duration_hours: number;
  instructor_name: string;
  is_active: boolean;
  created_at: string;
}

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const data = await adminAPI.getCourses();
      setCourses(data.courses || []);
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los cursos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId: string, courseTitle: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el curso "${courseTitle}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await adminAPI.deleteCourse(courseId);
      
      // Actualizar la lista local eliminando el curso
      setCourses(courses.filter(course => course.id !== courseId));
      
      toast({
        title: "Éxito",
        description: `Curso "${courseTitle}" eliminado correctamente`
      });
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el curso",
        variant: "destructive"
      });
    }
  };

  const toggleCourseStatus = async (courseId: string, currentStatus: boolean) => {
    try {
      // Encontrar el curso actual para obtener sus datos
      const currentCourse = courses.find(course => course.id === courseId);
      if (!currentCourse) return;

      // Actualizar usando el endpoint de actualización general
      await adminAPI.updateCourse(courseId, {
        title: currentCourse.title,
        description: currentCourse.title, // Por ahora usar title como description
        price: currentCourse.price,
        status: !currentStatus ? 'active' : 'inactive'
      });

      // Actualizar estado local
      setCourses(courses.map(course => 
        course.id === courseId 
          ? { ...course, is_active: !currentStatus }
          : course
      ));

      toast({
        title: "Éxito",
        description: `Curso ${!currentStatus ? 'activado' : 'desactivado'} correctamente`
      });
    } catch (error: any) {
      console.error('Error toggling course status:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado del curso",
        variant: "destructive"
      });
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.instructor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Cursos</h1>
            <p className="text-muted-foreground">
              Administra todos los cursos de la plataforma
            </p>
          </div>
          <Link to="/admin/cursos/crear">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Curso
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>
              Busca y filtra cursos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por título, categoría o instructor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cursos ({filteredCourses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">
                      {course.title}
                    </TableCell>
                    <TableCell>{course.category}</TableCell>
                    <TableCell>{course.instructor_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {course.level}
                      </Badge>
                    </TableCell>
                    <TableCell>{course.duration_hours}h</TableCell>
                    <TableCell>${course.price}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={course.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleCourseStatus(course.id, course.is_active)}
                      >
                        {course.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Link to={`/curso/${course.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link to={`/admin/cursos/editar/${course.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteCourse(course.id, course.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}