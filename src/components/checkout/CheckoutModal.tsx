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
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMercadoPago, setShowMercadoPago] = useState(false);
  
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
      id: "card",
      name: "Tarjeta",
      icon: <CreditCard className="w-6 h-6" />,
      description: "Tarjeta de débito o crédito",
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
      id: "paypal",
      name: "PayPal",
      icon: <Smartphone className="w-6 h-6" />,
      description: "Paga de forma segura con tu cuenta PayPal",
      available: true
    }
  ];

  const handlePayPalSuccess = async (details: any) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          cartItems,
          totalAmount,
          paymentMethod: 'paypal',
          paymentData: {
            orderID: details.id,
            payerID: details.payer?.payer_id
          }
        }
      });

      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "¡Pago exitoso!",
          description: "Tu pago con PayPal se procesó correctamente.",
        });
        clearCart();
        onClose();
        window.location.href = `/checkout/success/${data.orderId}`;
      } else {
        throw new Error(data.error || 'Error processing payment');
      }
    } catch (error) {
      console.error('PayPal payment error:', error);
      toast({
        title: "Error en el pago",
        description: error.message || "No se pudo procesar el pago con PayPal. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGooglePaySuccess = async (paymentData: any) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          cartItems,
          totalAmount,
          paymentMethod: 'googlepay',
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
        window.location.href = `/checkout/success/${data.orderId}`;
      } else {
        throw new Error(data.error || 'Error processing payment');
      }
    } catch (error) {
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
          cartItems,
          totalAmount,
          paymentMethod: 'card',
          paymentData: cardData
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "¡Pago exitoso!",
          description: "Tu pago con tarjeta se procesó correctamente.",
        });
        clearCart();
        onClose();
        // Redirect to success page
        window.location.href = `/checkout/success/${data.orderId}`;
      } else {
        throw new Error(data.error || 'Error processing card payment');
      }
    } catch (error) {
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
          cartItems,
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
          window.open(data.paymentUrl, '_blank');
        }
        toast({
          title: "Redirigiendo a Yape",
          description: "Se abrirá una nueva ventana para completar el pago con Yape.",
        });
        onClose();
      } else {
        throw new Error(data.error || 'Error creating Yape payment');
      }
    } catch (error) {
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
          cartItems,
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
          window.open(data.paymentUrl, '_blank');
        }
        toast({
          title: "Redirigiendo a Plin",
          description: "Se abrirá una nueva ventana para completar el pago con Plin.",
        });
        onClose();
      } else {
        throw new Error(data.error || 'Error creating Plin payment');
      }
    } catch (error) {
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
          cartItems,
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
          window.open(data.paymentUrl, '_blank');
        }
        toast({
          title: "Redirigiendo a MercadoPago",
          description: "Se abrirá una nueva ventana para completar el pago.",
        });
        onClose();
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
              
              {/* Google Pay Button - Always visible */}
              <div className="mt-4 p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Pago Rápido</h3>
                  <Badge variant="secondary">Google Pay</Badge>
                </div>
                <GooglePayButton
                  environment={googlePayConfig.environment}
                  paymentRequest={{
                    apiVersion: googlePayConfig.apiVersion,
                    apiVersionMinor: googlePayConfig.apiVersionMinor,
                    allowedPaymentMethods: googlePayConfig.allowedPaymentMethods,
                    merchantInfo: googlePayConfig.merchantInfo,
                    transactionInfo: {
                      totalPriceStatus: "FINAL",
                      totalPrice: totalAmount.toFixed(2),
                      currencyCode: "USD",
                      countryCode: "US"
                    }
                  }}
                  onLoadPaymentData={handleGooglePaySuccess}
                  existingPaymentMethodRequired={false}
                  buttonColor="default"
                  buttonType="pay"
                  buttonSizeMode="fill"
                />
              </div>

              {/* Credit/Debit Card Tab */}
              <TabsContent value="card" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Tarjeta de Débito/Crédito
                    </CardTitle>
                    <CardDescription>
                      Paga de forma segura con tu tarjeta Visa, Mastercard o American Express
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="card-number">Número de tarjeta</Label>
                        <Input
                          id="card-number"
                          placeholder="1234 5678 9012 3456"
                          value={cardData.number}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                            value = value.replace(/(.{4})/g, '$1 ').trim();
                            if (value.length <= 19) {
                              setCardData(prev => ({ ...prev, number: value }));
                            }
                          }}
                          maxLength={19}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="card-name">Nombre del titular</Label>
                        <Input
                          id="card-name"
                          placeholder="Juan Pérez"
                          value={cardData.name}
                          onChange={(e) => setCardData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="card-expiry">Fecha de vencimiento</Label>
                          <Input
                            id="card-expiry"
                            placeholder="MM/YY"
                            value={cardData.expiry}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, '');
                              if (value.length >= 2) {
                                value = value.substring(0, 2) + '/' + value.substring(2, 4);
                              }
                              if (value.length <= 5) {
                                setCardData(prev => ({ ...prev, expiry: value }));
                              }
                            }}
                            maxLength={5}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="card-cvc">CVC</Label>
                          <Input
                            id="card-cvc"
                            placeholder="123"
                            value={cardData.cvc}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              if (value.length <= 4) {
                                setCardData(prev => ({ ...prev, cvc: value }));
                              }
                            }}
                            maxLength={4}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email para confirmación</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu@email.com"
                          value={cardData.email}
                          onChange={(e) => setCardData(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Lock className="w-4 h-4" />
                      <span>Tus datos están protegidos con encriptación SSL de 256 bits</span>
                    </div>
                    
                    <Button
                      onClick={handleCardPayment}
                      disabled={isProcessing || !cardData.number || !cardData.name || !cardData.expiry || !cardData.cvc}
                      className="w-full"
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Procesando pago...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pagar ${totalAmount.toFixed(2)}
                        </>
                      )}
                    </Button>
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
