import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Clock, 
  User, 
  CheckCircle, 
  Play, 
  Star,
  ShoppingCart,
  BookOpen,
  Lock,
  CreditCard,
  Shield,
  Download,
  Users,
  Calendar,
  Award,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { courseAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import useCourseAccess from "@/hooks/useCourseAccess";
import CheckoutModal from "@/components/checkout/CheckoutModal";

interface Course {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  instructor_name: string;
  thumbnail_url?: string;
  category: string;
  level: string;
  duration_hours: number;
  price: number;
  is_free: boolean;
  requirements?: string[];
  what_you_learn?: string[];
  modules?: Module[];
}

interface Module {
  id: string;
  title: string;
  description?: string;
  order_number: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  order_number: number;
  is_free: boolean;
  video_url?: string;
  content?: string;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { addToCart, isInCart, cartItems } = useCart();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // Use course access hook to check if user has paid access
  const { access, loading: accessLoading, refreshAccess } = useCourseAccess(id || '');

  // Check if checkout should be shown from URL params
  useEffect(() => {
    if (searchParams.get('checkout') === 'true' && course && !access?.hasAccess) {
      setShowCheckout(true);
    }
  }, [searchParams, course, access]);

  const fetchCourseData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch course using API
      const courseResponse = await courseAPI.getById(id!);
      
      if (courseResponse.success && courseResponse.course) {
        setCourse(courseResponse.course);
        setModules(courseResponse.course.modules || []);
      } else {
        throw new Error('Course not found');
      }
    } catch (error: unknown) {
      console.error('Error fetching course data:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el curso",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (id) {
      fetchCourseData();
    }
  }, [id, fetchCourseData]);

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para agregar cursos al carrito",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!course) return;

    try {
      setAddingToCart(true);
      addToCart(course);
      toast({
        title: "¡Agregado al carrito!",
        description: `${course.title} se agregó a tu carrito`,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el curso al carrito",
        variant: "destructive",
      });
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para comprar cursos",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (!course) return;

    // Add to cart if not already there
    if (!isInCart(course.id)) {
      addToCart(course);
    }
    
    // Show checkout modal
    setShowCheckout(true);
  };

  const handleLessonClick = (lesson: Lesson) => {
    // Solo permitir acceso si el usuario tiene acceso al curso o la lección es gratis
    if (access?.hasAccess || lesson.is_free) {
      if (lesson.video_url) {
        window.open(lesson.video_url, '_blank');
      } else {
        navigate(`/courses/${id}/lessons/${lesson.id}`);
      }
    } else {
      toast({
        title: "Acceso restringido",
        description: "Necesitas comprar el curso para acceder a esta lección",
        variant: "destructive",
      });
    }
  };

  const handleStartCourse = () => {
    if (access?.hasAccess) {
      // Navigate to first lesson
      if (modules.length > 0 && modules[0].lessons.length > 0) {
        navigate(`/courses/${id}/lessons/${modules[0].lessons[0].id}`);
      }
    } else {
      handleBuyNow();
    }
  };

  if (loading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse bg-gradient-to-r from-blue-600 to-purple-600 w-16 h-16 rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando curso...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo encontrar el curso solicitado
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalDuration = modules.reduce((total, module) => 
    total + module.lessons.reduce((moduleTotal, lesson) => 
      moduleTotal + lesson.duration_minutes, 0), 0);

  const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);

  const isPaid = access?.hasAccess;
  const isInCartNow = isInCart(course.id);
  const isFree = course.is_free || course.price === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/courses')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a cursos
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Header */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">{course.category}</Badge>
                <Badge variant="outline">{course.level}</Badge>
                {isPaid && (
                  <Badge className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Comprado
                  </Badge>
                )}
              </div>
              
              <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-muted-foreground mb-6">{course.short_description}</p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  {course.instructor_name}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
                </div>
                <div className="flex items-center">
                  <BookOpen className="w-4 h-4 mr-2" />
                  {totalLessons} lecciones
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  {course.level}
                </div>
              </div>
            </div>

            {/* Course Content Tabs */}
            <Tabs defaultValue="overview" className="bg-white rounded-lg shadow-sm">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Descripción</TabsTrigger>
                <TabsTrigger value="curriculum">Contenido</TabsTrigger>
                <TabsTrigger value="requirements">Requisitos</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Descripción del curso</h3>
                  <p className="text-muted-foreground leading-relaxed">{course.description}</p>
                </div>

                {course.what_you_learn && course.what_you_learn.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">¿Qué aprenderás?</h3>
                    <ul className="space-y-2">
                      {course.what_you_learn.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="curriculum" className="p-6">
                <h3 className="text-xl font-semibold mb-6">Contenido del curso</h3>
                <div className="space-y-4">
                  {modules.map((module) => (
                    <Card key={module.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{module.title}</span>
                          <Badge variant="outline">
                            {module.lessons.length} lecciones
                          </Badge>
                        </CardTitle>
                        {module.description && (
                          <CardDescription>{module.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {module.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                isPaid || lesson.is_free
                                  ? 'hover:bg-gray-50 cursor-pointer'
                                  : 'bg-gray-50 cursor-not-allowed'
                              }`}
                              onClick={() => handleLessonClick(lesson)}
                            >
                              <div className="flex items-center space-x-3">
                                {isPaid || lesson.is_free ? (
                                  <Play className="w-4 h-4 text-blue-500" />
                                ) : (
                                  <Lock className="w-4 h-4 text-gray-400" />
                                )}
                                <div>
                                  <h4 className={`font-medium ${
                                    isPaid || lesson.is_free ? 'text-gray-900' : 'text-gray-500'
                                  }`}>
                                    {lesson.title}
                                  </h4>
                                  {lesson.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {lesson.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {lesson.is_free && (
                                  <Badge variant="secondary" className="text-xs">
                                    Gratis
                                  </Badge>
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {lesson.duration_minutes} min
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="requirements" className="p-6">
                <h3 className="text-xl font-semibold mb-6">Requisitos</h3>
                {course.requirements && course.requirements.length > 0 ? (
                  <ul className="space-y-2">
                    {course.requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    No se requieren conocimientos previos para este curso.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Course Preview */}
              <Card>
                <div className="relative">
                  <img
                    src={course.thumbnail_url || '/placeholder.svg'}
                    alt={course.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  {!isPaid && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-t-lg">
                      <div className="text-center text-white">
                        <Lock className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Vista previa</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    {isFree ? (
                      <div className="text-3xl font-bold text-green-600">Gratis</div>
                    ) : (
                      <div className="text-3xl font-bold">${course.price}</div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {isPaid ? (
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleStartCourse}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Continuar curso
                      </Button>
                    ) : isFree ? (
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={handleStartCourse}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Comenzar gratis
                      </Button>
                    ) : (
                      <>
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={handleBuyNow}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Comprar ahora
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={handleAddToCart}
                          disabled={addingToCart || isInCartNow}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {isInCartNow ? 'En el carrito' : 'Agregar al carrito'}
                        </Button>
                      </>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-semibold">Este curso incluye:</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                        {Math.floor(totalDuration / 60)}h {totalDuration % 60}m de contenido
                      </li>
                      <li className="flex items-center">
                        <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                        {totalLessons} lecciones
                      </li>
                      <li className="flex items-center">
                        <Download className="w-4 h-4 mr-2 text-muted-foreground" />
                        Recursos descargables
                      </li>
                      <li className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                        Acceso de por vida
                      </li>
                      <li className="flex items-center">
                        <Award className="w-4 h-4 mr-2 text-muted-foreground" />
                        Certificado de finalización
                      </li>
                    </ul>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Shield className="w-4 h-4 mr-1" />
                    Garantía de devolución de 30 días
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && course && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          cartItems={isInCartNow ? cartItems : [course]}
          totalAmount={isInCartNow ? cartItems.reduce((sum, item) => sum + item.price, 0) : course.price}
        />
      )}
    </div>
  );
}
