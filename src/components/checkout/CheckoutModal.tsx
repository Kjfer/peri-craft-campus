import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import {
  CreditCard,
  Smartphone,
  Wallet,
  Shield,
  CheckCircle,
  Loader2,
  X
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
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMercadoPago, setShowMercadoPago] = useState(false);

  // PayPal configuration
  const paypalOptions = {
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test",
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
            gateway: "stripe",
            gatewayMerchantId: import.meta.env.VITE_STRIPE_MERCHANT_ID || "",
          },
        },
      },
    ],
    merchantInfo: {
      merchantId: import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID || "",
      merchantName: "Peri Institute",
    },
  };

  const paymentMethods: PaymentMethod[] = [
    {
      id: "paypal",
      name: "PayPal",
      icon: <CreditCard className="w-6 h-6" />,
      description: "Paga de forma segura con tu cuenta PayPal",
      available: true
    },
    {
      id: "mercadopago",
      name: "MercadoPago",
      icon: <Wallet className="w-6 h-6" />,
      description: "Yape, Plin, tarjetas y más métodos peruanos",
      available: true
    },
    {
      id: "googlepay",
      name: "Google Pay",
      icon: <Smartphone className="w-6 h-6" />,
      description: "Pago rápido y seguro con Google Pay",
      available: true
    }
  ];

  const handlePayPalSuccess = async (details: any) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/payments/paypal/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify({
          orderID: details.id,
          cartItems,
          totalAmount
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "¡Pago exitoso!",
          description: "Tu pago con PayPal se procesó correctamente.",
        });
        clearCart();
        onClose();
      } else {
        throw new Error(result.message || 'Error processing payment');
      }
    } catch (error) {
      console.error('PayPal payment error:', error);
      toast({
        title: "Error en el pago",
        description: "No se pudo procesar el pago con PayPal. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGooglePaySuccess = async (paymentData: any) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/payments/googlepay/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify({
          paymentData,
          cartItems,
          totalAmount
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "¡Pago exitoso!",
          description: "Tu pago con Google Pay se procesó correctamente.",
        });
        clearCart();
        onClose();
      } else {
        throw new Error(result.message || 'Error processing payment');
      }
    } catch (error) {
      console.error('Google Pay payment error:', error);
      toast({
        title: "Error en el pago",
        description: "No se pudo procesar el pago con Google Pay. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMercadoPagoPayment = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/payments/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase_token')}`
        },
        body: JSON.stringify({
          cartItems,
          totalAmount,
          user: {
            email: user?.email,
            name: user?.user_metadata?.full_name || user?.email
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Redirect to MercadoPago checkout
        window.open(result.checkoutUrl, '_blank');
        toast({
          title: "Redirigiendo a MercadoPago",
          description: "Se abrirá una nueva ventana para completar el pago.",
        });
        onClose();
      } else {
        throw new Error(result.message || 'Error creating payment preference');
      }
    } catch (error) {
      console.error('MercadoPago payment error:', error);
      toast({
        title: "Error en el pago",
        description: "No se pudo crear la preferencia de pago. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

              {/* PayPal Tab */}
              <TabsContent value="paypal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      PayPal
                    </CardTitle>
                    <CardDescription>
                      Paga de forma segura con tu cuenta PayPal o tarjeta de crédito
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
                        createOrder={(data, actions) => {
                          return actions.order.create({
                            intent: "CAPTURE",
                            purchase_units: [
                              {
                                amount: {
                                  value: totalAmount.toFixed(2),
                                  currency_code: "USD"
                                },
                                description: `Peri Institute - ${cartItems.length} curso(s)`
                              }
                            ]
                          });
                        }}
                        onApprove={async (data, actions) => {
                          const details = await actions.order?.capture();
                          if (details) {
                            handlePayPalSuccess(details);
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

              {/* MercadoPago Tab */}
              <TabsContent value="mercadopago" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Wallet className="w-5 h-5 mr-2" />
                      MercadoPago
                    </CardTitle>
                    <CardDescription>
                      Métodos de pago populares en Perú y Sudamérica
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Badge variant="outline" className="justify-center py-2">
                        <img src="/api/placeholder/24/24" alt="Yape" className="w-4 h-4 mr-1" />
                        Yape
                      </Badge>
                      <Badge variant="outline" className="justify-center py-2">
                        <img src="/api/placeholder/24/24" alt="Plin" className="w-4 h-4 mr-1" />
                        Plin
                      </Badge>
                      <Badge variant="outline" className="justify-center py-2">
                        <CreditCard className="w-4 h-4 mr-1" />
                        Tarjetas
                      </Badge>
                      <Badge variant="outline" className="justify-center py-2">
                        <Wallet className="w-4 h-4 mr-1" />
                        Efectivo
                      </Badge>
                    </div>
                    
                    <Button
                      onClick={handleMercadoPagoPayment}
                      disabled={isProcessing}
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
                          Pagar con MercadoPago
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

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
                  <CardContent>
                    <div className="text-center p-8">
                      <Smartphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Google Pay</h3>
                      <p className="text-muted-foreground mb-4">
                        Google Pay estará disponible próximamente
                      </p>
                      <Button disabled className="w-full">
                        <Smartphone className="w-4 h-4 mr-2" />
                        Próximamente
                      </Button>
                    </div>
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
