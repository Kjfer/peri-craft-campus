import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Download, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Course {
  course_id: string;
  course_name: string;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const coursesParam = searchParams.get('courses');
    const messageParam = searchParams.get('message');
    
    if (coursesParam) {
      try {
        setCourses(JSON.parse(decodeURIComponent(coursesParam)));
      } catch (error) {
        console.error('Error parsing courses:', error);
      }
    }
    
    if (messageParam) {
      setMessage(decodeURIComponent(messageParam));
    }
  }, [searchParams]);

  const handleDownloadReceipt = () => {
    toast({
      title: "Descargando comprobante",
      description: "Tu comprobante se está descargando...",
    });
  };

  const handleGoToCourses = () => {
    navigate('/dashboard');
  };

  const handleContinueShopping = () => {
    navigate('/cursos');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <CardTitle className="text-2xl text-success">¡Pago Exitoso!</CardTitle>
          <p className="text-muted-foreground mt-2">
            {message || 'Tu pago se ha procesado correctamente'}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {courses.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Cursos Activados:</h3>
              <div className="space-y-2">
                {courses.map((course, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">{course.course_name}</span>
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleDownloadReceipt} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Descargar Comprobante
            </Button>
            <Button onClick={handleGoToCourses} className="flex-1">
              Ir a Mis Cursos
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={handleContinueShopping}>
              Continuar Comprando
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>¿Necesitas ayuda? <a href="/contacto" className="text-primary hover:underline">Contáctanos</a></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}