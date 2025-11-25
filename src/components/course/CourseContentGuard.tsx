import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useCourseAccess from '@/hooks/useCourseAccess';
import { 
  Lock, 
  CreditCard, 
  ShoppingCart, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface CourseContentGuardProps {
  courseId: string;
  children: ReactNode;
  fallbackContent?: ReactNode;
  redirectToCheckout?: boolean;
}

export default function CourseContentGuard({
  courseId,
  children,
  fallbackContent,
  redirectToCheckout = false
}: CourseContentGuardProps) {
  const { access, loading, error, refreshAccess } = useCourseAccess(courseId);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!access) {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          Verificando acceso al curso...
        </AlertDescription>
      </Alert>
    );
  }

  // If user has access, render the protected content
  if (access.hasAccess && access.isPaid) {
    return <>{children}</>;
  }

  // If redirectToCheckout is true and user doesn't have access, redirect to course detail
  if (redirectToCheckout && !access.hasAccess) {
    return <Navigate to={`/curso/${courseId}`} replace />;
  }

  // Render fallback content or default access denied content
  if (fallbackContent) {
    return <>{fallbackContent}</>;
  }

  // Default access denied content
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl">Acceso Restringido</CardTitle>
          <CardDescription>
            Necesitas comprar este curso para acceder al contenido
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {access.paymentStatus === 'pending' ? (
            <div className="text-center">
              <Badge variant="outline" className="mb-4">
                <Clock className="w-4 h-4 mr-2" />
                Pago Pendiente
              </Badge>
              <p className="text-sm text-muted-foreground mb-4">
                Tu pago está siendo procesado. Esto puede tomar unos minutos.
              </p>
              <Button
                onClick={refreshAccess}
                variant="outline"
                className="w-full"
              >
                <Loader2 className="w-4 h-4 mr-2" />
                Verificar Estado del Pago
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">¿Qué obtienes al comprar?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Acceso completo al curso
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Lecciones en video HD
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Certificado de finalización
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Acceso de por vida
                  </li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => window.location.href = `/curso/${courseId}`}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Ver Detalles del Curso
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Higher-order component for page-level protection
export function withCourseAccess<P extends object>(
  Component: React.ComponentType<P & { courseId: string }>,
  options: {
    redirectToCheckout?: boolean;
    fallbackContent?: ReactNode;
  } = {}
) {
  return function ProtectedComponent(props: P & { courseId: string }) {
    return (
      <CourseContentGuard
        courseId={props.courseId}
        redirectToCheckout={options.redirectToCheckout}
        fallbackContent={options.fallbackContent}
      >
        <Component {...props} />
      </CourseContentGuard>
    );
  };
}
