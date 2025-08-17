# Configuración de Métodos de Pago

Este documento explica cómo configurar los diferentes métodos de pago integrados en la plataforma Peri Institute.

## 🏦 Métodos de Pago Disponibles

### 1. PayPal
- **Descripción**: Pago internacional con PayPal
- **Moneda**: USD
- **Región**: Global

### 2. MercadoPago
- **Descripción**: Métodos de pago populares en Sudamérica
- **Moneda**: PEN (Soles Peruanos)
- **Región**: Perú, Colombia, Argentina, Brasil, Chile, México
- **Métodos incluidos**:
  - Yape (Perú)
  - Plin (Perú)
  - Tarjetas de crédito/débito
  - Efectivo (PagoEfectivo, Oxxo, etc.)

### 3. Google Pay
- **Descripción**: Pago rápido con Google Pay
- **Moneda**: USD
- **Región**: Global
- **Backend**: Stripe

## 🔧 Configuración del Frontend

### Variables de Entorno (.env)

```bash
# PayPal
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id

# Stripe (para Google Pay)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_STRIPE_MERCHANT_ID=your_stripe_merchant_id

# Google Pay
VITE_GOOGLE_PAY_MERCHANT_ID=your_google_pay_merchant_id

# MercadoPago
VITE_MERCADOPAGO_PUBLIC_KEY=your_mercadopago_public_key

# URLs de la aplicación
VITE_APP_URL=http://localhost:8080
VITE_API_URL=http://localhost:3003
```

## 🚀 Configuración del Backend

### Variables de Entorno (.env)

```bash
# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Stripe (para Google Pay)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=your_mercadopago_access_token

# URLs de la aplicación
FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:3003
```

## 📋 Configuración por Método de Pago

### PayPal

1. **Crear aplicación en PayPal Developer**:
   - Ir a [PayPal Developer](https://developer.paypal.com/)
   - Crear nueva aplicación
   - Obtener Client ID y Client Secret

2. **Configurar webhooks**:
   - URL: `https://tu-dominio.com/api/payments/paypal/webhook`
   - Eventos: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`

### MercadoPago

1. **Crear aplicación en MercadoPago**:
   - Ir a [MercadoPago Developers](https://www.mercadopago.com.pe/developers/)
   - Crear nueva aplicación
   - Obtener Access Token y Public Key

2. **Configurar webhooks**:
   - URL: `https://tu-dominio.com/api/payments/mercadopago/webhook`
   - Eventos: `payment`

3. **Métodos de pago específicos para Perú**:
   - Yape: Configurado automáticamente
   - Plin: Configurado automáticamente
   - Tarjetas: Visa, Mastercard habilitadas por defecto
   - Efectivo: PagoEfectivo habilitado

### Google Pay (Stripe)

1. **Configurar Stripe**:
   - Crear cuenta en [Stripe](https://stripe.com/)
   - Obtener claves de API
   - Configurar webhooks

2. **Configurar Google Pay**:
   - Registrarse en [Google Pay & Wallet Console](https://pay.google.com/business/console/)
   - Obtener Merchant ID
   - Configurar dominio autorizado

3. **Configurar webhooks**:
   - URL: `https://tu-dominio.com/api/payments/googlepay/webhook`
   - Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`

## 🔐 Seguridad

### Webhooks
Todos los webhooks deben estar configurados con:
- **HTTPS**: Obligatorio en producción
- **Verificación de firma**: Implementada para todos los métodos
- **Idempotencia**: Manejo de eventos duplicados

### Datos sensibles
- Las claves secretas solo se almacenan en el backend
- Las claves públicas se usan en el frontend
- Todas las transacciones se procesan a través de HTTPS

## 🧪 Testing

### Modo Sandbox/Test

**PayPal**:
- Usar `sandbox` environment
- Client ID y Secret de sandbox

**Stripe**:
- Usar claves que empiecen con `sk_test_` y `pk_test_`
- Tarjetas de prueba: `4242424242424242`

**MercadoPago**:
- Usar Access Token de test
- CPF de prueba: `12345678901`

### Tarjetas de Prueba

**Para Stripe (Google Pay)**:
```
Visa: 4242424242424242
Mastercard: 5555555555554444
CVV: cualquier 3 dígitos
Fecha: cualquier fecha futura
```

**Para MercadoPago**:
```
Visa: 4509953566233704
Mastercard: 5031433215406351
CVV: 123
Fecha: 11/25
```

## 🌐 URLs de Redirección

### Estructura de URLs

```
Success: /payment/success?order=ORDER_ID&payment_method=METHOD
Failure: /payment/failure?order=ORDER_ID&error=ERROR_CODE
Pending: /payment/pending?order=ORDER_ID
```

### Configuración en cada método

**PayPal**:
```javascript
back_urls: {
  success: `${FRONTEND_URL}/payment/success?order=${orderId}`,
  failure: `${FRONTEND_URL}/payment/failure?order=${orderId}`,
  pending: `${FRONTEND_URL}/payment/pending?order=${orderId}`
}
```

**MercadoPago**:
```javascript
back_urls: {
  success: `${FRONTEND_URL}/payment/success?order=${orderId}`,
  failure: `${FRONTEND_URL}/payment/failure?order=${orderId}`,
  pending: `${FRONTEND_URL}/payment/pending?order=${orderId}`
}
```

## 🚨 Troubleshooting

### Errores Comunes

1. **"Invalid Client ID"**:
   - Verificar que las claves de API estén correctas
   - Verificar el ambiente (sandbox vs live)

2. **"Webhook verification failed"**:
   - Verificar que el webhook secret esté correcto
   - Verificar que la URL del webhook sea accesible

3. **"Payment method not available"**:
   - Verificar configuración del país
   - Verificar que el método esté habilitado en la cuenta

### Logs y Debugging

```javascript
// Activar logs en desarrollo
console.log('Payment debug:', {
  method: payment_method,
  amount: total_amount,
  currency: currency,
  order_id: order_id
});
```

## 📱 Métodos de Pago Específicos para Perú

### Yape
- **Descripción**: Billetera digital del BCP
- **Integración**: A través de MercadoPago
- **Límites**: Hasta S/ 500 por transacción

### Plin
- **Descripción**: Billetera digital multi-banco
- **Integración**: A través de MercadoPago
- **Límites**: Hasta S/ 500 por transacción

### PagoEfectivo
- **Descripción**: Pago en efectivo en tiendas físicas
- **Integración**: A través de MercadoPago
- **Tiempo**: Hasta 3 días hábiles para confirmación

## 🔄 Flujo de Pago

1. **Usuario selecciona cursos** → Agrega al carrito
2. **Usuario hace checkout** → Selecciona método de pago
3. **Procesamiento** → Redirección a pasarela
4. **Confirmación** → Webhook actualiza estado
5. **Finalización** → Usuario recibe acceso a cursos

## 📧 Soporte

Para problemas con la configuración de pagos:
- Email: dev@periinstitute.com
- Documentación: [GitHub Wiki](link-to-wiki)
- Issues: [GitHub Issues](link-to-issues)
