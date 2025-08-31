import React, { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { orderAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  CreditCard, 
  ShoppingCart, 
  User, 
  Clock, 
  CheckCircle,
  ArrowLeft,
  Lock
} from 'lucide-react';

interface OrderSummary {
  subtotal: number;
  tax: number;
  total: number;
}

export default function CheckoutSecure() {
  const { state: cartState, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({
    subtotal: 0,
    tax: 0,
    total: 0,
  });

  // Form data
  const [formData, setFormData] = useState({
    email: user?.email || '',
    fullName: '',
    country: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
  });

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      navigate('/auth');
      return;
    }

    // Redirect if cart is empty
    if (cartState.items.length === 0) {
      navigate('/cursos');
      toast({
        title: "Carrito vacío",
        description: "Agrega algunos cursos antes de proceder al checkout.",
        variant: "destructive",
      });
      return;
    }

    // Calculate order summary
    const subtotal = cartState.total;
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;

    setOrderSummary({ subtotal, tax, total });

    // Load user profile data
    loadUserProfile();
  }, [user, cartState.items, navigate]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, country')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setFormData(prev => ({
          ...prev,
          fullName: profile.full_name || '',
          country: profile.country || '',
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { fullName, cardNumber, expiryDate, cvv, nameOnCard } = formData;
    
    if (!fullName || !cardNumber || !expiryDate || !cvv || !nameOnCard) {
      toast({
        title: "Datos incompletos",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return false;
    }

    if (cardNumber.length < 16) {
      toast({
        title: "Tarjeta inválida",
        description: "El número de tarjeta debe tener al menos 16 dígitos.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const processPayment = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Create order via API with secure data handling
      const result = await orderAPI.create({
        payment_method: paymentMethod,
        // Note: Credit card data should be processed through secure payment gateway
        // This is a simplified example - in production, use Stripe/PayPal APIs
        payment_data: {
          // Only send minimal required data
          payment_type: 'card',
          billing_name: formData.nameOnCard,
        },
      });

      if (!result.success) {
        throw new Error(result.error || 'Error processing payment');
      }

      // Show success message
      toast({
        title: "¡Pago exitoso!",
        description: `Tu orden ${result.order.order_number} ha sido procesada exitosamente.`,
      });

      // Redirect to success page
      navigate(`/checkout/success/${result.order.id}`);

    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Error en el pago",
        description: error instanceof Error ? error.message : "Hubo un problema procesando tu pago. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || cartState.items.length === 0) {
    return null; // Will be redirected by useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/cursos')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al catálogo
          </Button>
          <h1 className="text-3xl font-bold">Finalizar Compra</h1>
          <p className="text-muted-foreground">
            Completa tu información para procesar el pago
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fullName">Nombre Completo *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder="Tu nombre completo"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="Tu país"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Método de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Nota de Seguridad:</strong> Esta es una demostración. 
                    En producción, los datos de tarjeta se procesarían a través de 
                    un gateway de pago seguro como Stripe o PayPal.
                  </p>
                </div>
                
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card">Tarjeta de Crédito/Débito (Demo)</Label>
                  </div>
                </RadioGroup>

                {paymentMethod === 'card' && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="nameOnCard">Nombre en la Tarjeta *</Label>
                      <Input
                        id="nameOnCard"
                        value={formData.nameOnCard}
                        onChange={(e) => handleInputChange('nameOnCard', e.target.value)}
                        placeholder="Nombre como aparece en la tarjeta"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cardNumber">Número de Tarjeta * (Demo)</Label>
                      <Input
                        id="cardNumber"
                        value={formData.cardNumber}
                        onChange={(e) => handleInputChange('cardNumber', e.target.value.replace(/\D/g, ''))}
                        placeholder="4111 1111 1111 1111 (Tarjeta de prueba)"
                        maxLength={16}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryDate">Fecha de Vencimiento *</Label>
                        <Input
                          id="expiryDate"
                          value={formData.expiryDate}
                          onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                          placeholder="12/25"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV *</Label>
                        <Input
                          id="cvv"
                          value={formData.cvv}
                          onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, ''))}
                          placeholder="123"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Resumen de Orden
                </CardTitle>
                <CardDescription>
                  {cartState.items.length} curso{cartState.items.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Course List */}
                <div className="space-y-3">
                  {cartState.items.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        {item.course.thumbnail_url ? (
                          <img
                            src={item.course.thumbnail_url}
                            alt={item.course.title}
                            className="w-16 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                            <span className="text-xs font-bold">
                              {item.course.title.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-sm leading-tight mb-1">
                          {item.course.title}
                        </h4>
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.course.instructor_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.course.duration_hours}h
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {item.course.level}
                          </Badge>
                          <span className="font-bold text-sm">
                            ${item.course.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${orderSummary.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impuestos:</span>
                    <span>${orderSummary.tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${orderSummary.total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={processPayment}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Pagar ${orderSummary.total.toFixed(2)} (Demo)
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Tu información está protegida con encriptación SSL
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}