import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import GooglePayButton from "@google-pay/button-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import {
  CreditCard,
  Smartphone,
  Wallet,
  Shield,
  CheckCircle,
  Loader2,
  X,
  Lock,
  Calendar,
  User
} from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: any[];
  totalAmount: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
  processing?: boolean;
}

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  cartItems, 
  totalAmount 
}: CheckoutModalProps) {
  const { user } = useAuth();
  const { clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMercadoPago, setShowMercadoPago] = useState(false);
  const [paypalDbOrderId, setPaypalDbOrderId] = useState<string | null>(null);
  
  // Card form state
  const [cardData, setCardData] = useState({
    number: "",
    name: "",
    expiry: "",
    cvc: "",
    email: user?.email || ""
  });

  // PayPal configuration
  const paypalOptions = {
    clientId: "AZDxjDScFpQtjWTOUtWKbyN_bDt4OgqaF4eYXlewfBP4-8aqX3PiV8e1GWU6liB2CUXlkA59kJXE7M6R",
    currency: "USD",
    intent: "capture" as const
  };

  // Google Pay configuration
  const googlePayConfig = {
    environment: "TEST" as const,
    apiVersion: 2,
    apiVersionMinor: 0,
    allowedPaymentMethods: [
      {
        type: "CARD" as const,
        parameters: {
          allowedAuthMethods: ["PAN_ONLY" as const, "CRYPTOGRAM_3DS" as const],
          allowedCardNetworks: ["MASTERCARD" as const, "VISA" as const],
        },
        tokenizationSpecification: {
          type: "PAYMENT_GATEWAY" as const,
          parameters: {
            gateway: "example",
            gatewayMerchantId: "exampleGatewayMerchantId",
          },
        },
      },
    ],
    merchantInfo: {
      merchantId: "BCR2DN4T2C5UXTUD",
      merchantName: "Peri Institute",
    },
    transactionInfo: {
      totalPriceStatus: "FINAL" as const,
      totalPrice: totalAmount.toString(),
      currencyCode: "USD",
    },
  };

  const paymentMethods: PaymentMethod[] = [
    {
      id: "mercadopago",
      name: "MercadoPago",
      icon: <Wallet className="w-6 h-6" />,
      description: "Yape y tarjetas de crédito o débito",
      available: true
    },
    {
      id: "paypal",
      name: "PayPal",
      icon: <Smartphone className="w-6 h-6" />,
      description: "Paga de forma segura con tu cuenta PayPal",
      available: true
    },
    {
      id: "googlepay",
      name: "Google Pay",
      icon: <Smartphone className="w-6 h-6" />,
      description: "Pago rápido con Google Pay",
      available: true
    }
  ];

  // Removed unused handlePayPalSuccess function

  const handleGooglePaySuccess = async (paymentData: any) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('googlepay', {
        body: {
          cartItems: cartItems.map(item => ({
            id: item.course_id,
            title: item.course.title,
            price: item.course.price,
            instructor_name: item.course.instructor_name,
            thumbnail_url: item.course.thumbnail_url
          })),
          totalAmount,
          paymentData: paymentData
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "¡Pago exitoso!",
          description: "Tu pago con Google Pay se procesó correctamente.",
        });
        clearCart();
        onClose();
        navigate(`/checkout/success/${data.orderId}`);
      } else {
        throw new Error(data.error || 'Error processing payment');
      }
    } catch (error: any) {
      console.error('Google Pay payment error:', error);
      toast({
        title: "Error en el pago",
        description: error.message || "No se pudo procesar el pago con Google Pay. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    setIsProcessing(true);
    try {
      // Validate card data
      if (!cardData.number || !cardData.name || !cardData.expiry || !cardData.cvc) {
        throw new Error('Por favor completa todos los campos de la tarjeta');
      }

      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          cartItems: cartItems.map(item => ({
            id: item.course_id,
            title: item.course.title,
            price: item.course.price,
            instructor_name: item.course.instructor_name,
            thumbnail_url: item.course.thumbnail_url
          })),
          totalAmount,
          paymentMethod: 'mercadopago_card',
          paymentData: cardData
        }
      });

      if (error) throw error;

      if (data.success) {
        if (data.paymentUrl) {
          // Redirect to MercadoPago for card payment
          window.location.href = data.paymentUrl;
        } else {
          throw new Error('No payment URL received from MercadoPago');
        }
      } else {
        throw new Error(data.error || 'Error processing card payment');
      }
    } catch (error: any) {
      console.error('Card payment error:', error);
      toast({
        title: "Error en el pago",
        description: error.message || "No se pudo procesar el pago con tarjeta. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMercadoPagoYape = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          cartItems: cartItems.map(item => ({
            id: item.course_id,
            title: item.course.title,
            price: item.course.price,
            instructor_name: item.course.instructor_name,
            thumbnail_url: item.course.thumbnail_url
          })),
          totalAmount,
          paymentMethod: 'yape',
          paymentData: {
            user: {
              email: user?.email,
              name: user?.user_metadata?.full_name || user?.email
            }
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        if (data.paymentUrl) {
          // Redirect to Yape via MercadoPago
          window.location.href = data.paymentUrl;
        } else {
          throw new Error('No payment URL received for Yape');
        }
      } else {
        throw new Error(data.error || 'Error processing Yape payment');
      }
    } catch (error: any) {
      console.error('Yape payment error:', error);
      toast({
        title: "Error en el pago",
        description: error.message || "No se pudo crear el pago con Yape. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMercadoPagoPlin = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          cartItems: cartItems.map(item => ({
            id: item.course_id,
            title: item.course.title,
            price: item.course.price,
            instructor_name: item.course.instructor_name,
            thumbnail_url: item.course.thumbnail_url
          })),
          totalAmount,
          paymentMethod: 'plin',
          paymentData: {
            user: {
              email: user?.email,
              name: user?.user_metadata?.full_name || user?.email
            }
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        if (data.paymentUrl) {
          // Redirect to Plin via MercadoPago
          window.location.href = data.paymentUrl;
        } else {
          throw new Error('No payment URL received for Plin');
        }
      } else {
        throw new Error(data.error || 'Error processing Plin payment');
      }
    } catch (error: any) {
      console.error('Plin payment error:', error);
      toast({
        title: "Error en el pago",
        description: error.message || "No se pudo crear el pago con Plin. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMercadoPagoPayment = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          cartItems: cartItems.map(item => ({
            id: item.course_id,
            title: item.course.title,
            price: item.course.price,
            instructor_name: item.course.instructor_name,
            thumbnail_url: item.course.thumbnail_url
          })),
          totalAmount,
          paymentMethod: 'mercadopago',
          paymentData: {
            user: {
              email: user?.email,
              name: user?.user_metadata?.full_name || user?.email
            }
          }
        }
      });

      if (error) throw error;
      
      if (data.success) {
        if (data.paymentUrl) {
          // Redirect to MercadoPago checkout
          window.location.href = data.paymentUrl;
        } else {
          throw new Error('No payment URL received from MercadoPago');
        }
      } else {
        throw new Error(data.error || 'Error creating payment preference');
      }
    } catch (error) {
      console.error('MercadoPago payment error:', error);
      toast({
        title: "Error en el pago",
        description: error.message || "No se pudo crear la preferencia de pago. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Persist selected method in sessionStorage to prevent loss on tab changes
  useEffect(() => {
    if (selectedMethod) {
      sessionStorage.setItem('checkout-selected-method', selectedMethod);
    }
  }, [selectedMethod]);

  // Restore selected method on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('checkout-selected-method');
    if (saved && !selectedMethod) {
      setSelectedMethod(saved);
    }
  }, []);

  // Clear on close
  useEffect(() => {
    if (!isOpen) {
      sessionStorage.removeItem('checkout-selected-method');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isProcessing) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => {
        if (isProcessing) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Checkout Seguro
          </DialogTitle>
          <DialogDescription>
            Selecciona tu método de pago preferido para completar la compra
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        por {item.instructor_name}
                      </p>
                    </div>
                    <span className="font-semibold">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-primary">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center text-xs text-muted-foreground">
                  <Shield className="w-3 h-3 mr-1" />
                  Compra 100% segura y protegida
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Methods */}
          <div className="lg:col-span-2">
            <Tabs value={selectedMethod} onValueChange={setSelectedMethod}>
              <TabsList className="grid w-full grid-cols-3">
                {paymentMethods.map((method) => (
                  <TabsTrigger
                    key={method.id}
                    value={method.id}
                    disabled={!method.available}
                    className="flex items-center space-x-2"
                  >
                    {method.icon}
                    <span className="hidden sm:inline">{method.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {/* Google Pay Tab */}
              <TabsContent value="googlepay" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Smartphone className="w-5 h-5 mr-2" />
                      Google Pay
                    </CardTitle>
                    <CardDescription>
                      Pago rápido y seguro con Google Pay
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Pago con Google Pay</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Usa tu cuenta de Google para realizar el pago de forma rápida y segura.
                      </p>
                      
                      <GooglePayButton
                        environment={googlePayConfig.environment}
                        paymentRequest={googlePayConfig}
                        onLoadPaymentData={handleGooglePaySuccess}
                        onError={(error) => {
                          console.error('Google Pay error:', error);
                          toast({
                            title: "Error en Google Pay",
                            description: "No se pudo inicializar Google Pay. Intenta con otro método.",
                            variant: "destructive",
                          });
                        }}
                        buttonColor="black"
                        buttonType="pay"
                        buttonSizeMode="fill"
                      />
                    </div>
                    
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Shield className="w-3 h-3 mr-1" />
                      Tu información de pago está protegida por Google
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* MercadoPago Tab */}
              <TabsContent value="mercadopago" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Wallet className="w-5 h-5 mr-2" />
                      MercadoPago - Métodos Peruanos
                    </CardTitle>
                    <CardDescription>
                      Métodos de pago populares en Perú y Sudamérica
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Yape Button */}
                    <Card className="border-2 border-purple-200 hover:border-purple-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Smartphone className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-purple-900">Yape</h3>
                              <p className="text-sm text-muted-foreground">Pago instantáneo con Yape</p>
                            </div>
                          </div>
                          <Button
                            onClick={handleMercadoPagoYape}
                            disabled={isProcessing}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Pagar"
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Plin Button */}
                    <Card className="border-2 border-blue-200 hover:border-blue-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Smartphone className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-blue-900">Plin</h3>
                              <p className="text-sm text-muted-foreground">Pago rápido con Plin</p>
                            </div>
                          </div>
                          <Button
                            onClick={handleMercadoPagoPlin}
                            disabled={isProcessing}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Pagar"
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Other MercadoPago Methods */}
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-3">Otros métodos disponibles:</h3>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <Badge variant="outline" className="justify-center py-2">
                            <CreditCard className="w-4 h-4 mr-1" />
                            Tarjetas
                          </Badge>
                          <Badge variant="outline" className="justify-center py-2">
                            <Wallet className="w-4 h-4 mr-1" />
                            Efectivo
                          </Badge>
                          <Badge variant="outline" className="justify-center py-2">
                            <User className="w-4 h-4 mr-1" />
                            Tunki
                          </Badge>
                          <Badge variant="outline" className="justify-center py-2">
                            <Calendar className="w-4 h-4 mr-1" />
                            Cuotas
                          </Badge>
                        </div>
                        
                        <Button
                          onClick={handleMercadoPagoPayment}
                          disabled={isProcessing}
                          variant="outline"
                          className="w-full"
                          size="lg"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <Wallet className="w-4 h-4 mr-2" />
                              Ver todos los métodos
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PayPal Tab */}
              <TabsContent value="paypal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Smartphone className="w-5 h-5 mr-2" />
                      PayPal
                    </CardTitle>
                    <CardDescription>
                      Paga de forma segura con tu cuenta PayPal
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PayPalScriptProvider options={paypalOptions}>
                      <PayPalButtons
                        style={{
                          layout: "vertical",
                          color: "blue",
                          shape: "rect",
                          label: "paypal"
                        }}
                        createOrder={async () => {
                          console.log('PayPal createOrder called');
                          setIsProcessing(true);
                          try {
                            const { data, error } = await supabase.functions.invoke('paypal', {
                              body: {
                                action: 'create',
                                cartItems: cartItems.map(item => ({
                                  id: item.course_id ?? item.id,
                                  course_id: item.course_id ?? item.id,
                                  subscription_id: item.subscription_id || null,
                                  title: item.course?.title ?? item.title,
                                  price: item.course?.price ?? item.price,
                                  instructor_name: item.course?.instructor_name ?? item.instructor_name,
                                  thumbnail_url: item.course?.thumbnail_url ?? item.thumbnail_url,
                                  type: item.subscription_id ? 'subscription' : 'course'
                                })),
                                totalAmount
                              }
                            });
                            console.log('PayPal edge function response:', data, error);
                            if (error || !data?.paypalOrderId) {
                              throw new Error(error?.message || 'No se pudo crear la orden de PayPal');
                            }
                            setPaypalDbOrderId(data.dbOrderId);
                            return data.paypalOrderId as string;
                          } catch (e: any) {
                            console.error('PayPal createOrder error:', e);
                            toast({
                              title: 'Error de PayPal',
                              description: e.message || 'No se pudo crear la orden.',
                              variant: 'destructive'
                            });
                            throw e;
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        onApprove={async (data) => {
                          console.log('PayPal onApprove called:', data);
                          setIsProcessing(true);
                          try {
                            const { data: cap, error } = await supabase.functions.invoke('paypal', {
                              body: {
                                action: 'capture',
                                orderID: data.orderID,
                                dbOrderId: paypalDbOrderId
                              }
                            });
                            console.log('PayPal capture response:', cap, error);
                            if (error || !cap?.success) {
                              throw new Error(error?.message || cap?.error || 'No se pudo completar el pago con PayPal');
                            }
                            toast({
                              title: '¡Pago exitoso!',
                              description: 'Tu pago con PayPal se procesó correctamente.',
                            });
                            clearCart();
                            onClose();
                            navigate(`/checkout/success/${cap.orderId}`);
                          } catch (e: any) {
                            console.error('PayPal capture error:', e);
                            toast({
                              title: 'Error en el pago',
                              description: e.message || 'No se pudo completar el pago con PayPal.',
                              variant: 'destructive'
                            });
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        onError={(err) => {
                          console.error('PayPal Error:', err);
                          toast({
                            title: "Error de PayPal",
                            description: "Ocurrió un error con PayPal. Intenta nuevamente.",
                            variant: "destructive",
                          });
                        }}
                        disabled={isProcessing}
                      />
                    </PayPalScriptProvider>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <Shield className="w-4 h-4" />
          <span>
            Todos los pagos están protegidos con encriptación SSL de 256 bits
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
