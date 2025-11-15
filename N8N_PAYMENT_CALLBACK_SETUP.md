# Configuración del Callback de N8n para Validación de Pagos

## Flujo Completo

1. **Usuario sube comprobante** → `checkoutService.confirmManualPayment()` envía datos a N8n
2. **N8n valida el pago** → Procesa la imagen del comprobante y verifica los datos
3. **N8n responde** → Llama al webhook de callback para actualizar el estado
4. **Sistema actualiza orden** → El edge function actualiza `payment_status` en la tabla `orders`
5. **Usuario es notificado** → El listener en tiempo real detecta el cambio y redirige

## Datos que N8n Recibe (GET request)

Cuando el usuario sube un comprobante, N8n recibe estos parámetros por GET:

```
user_id: UUID del usuario
user_name: Nombre completo del usuario
user_email: Email del usuario
order_id: UUID de la orden
transaction_id: Código de operación ingresado por el usuario
receipt_url: URL pública del comprobante subido
amount: Monto de la orden (redondeado a 1 decimal)
currency: Moneda de la orden (generalmente "PEN")
payment_type: "course" | "subscription"
payment_method: "yape_qr"
callback_url: URL del webhook para responder
```

## Cómo N8n Debe Responder

### URL del Webhook de Callback

La URL está incluida en el parámetro `callback_url` que N8n recibe. Típicamente es:

```
https://idjmabhvzupcdygguqzm.supabase.co/functions/v1/n8n-payment-callback
```

### Formato del Request (POST)

N8n debe hacer una llamada **POST** con este payload JSON:

#### Para pagos APROBADOS:

```json
{
  "orderId": "uuid-de-la-orden-recibido",
  "status": "approved"
}
```

#### Para pagos RECHAZADOS:

```json
{
  "orderId": "uuid-de-la-orden-recibido",
  "status": "rejected",
  "rejectionReason": "comprobante_incorrecto"
}
```

### Razones de Rechazo Soportadas

Estos valores en `rejectionReason` mostrarán mensajes específicos al usuario:

- `"comprobante_incorrecto"` → "El comprobante no coincide con los datos de tu orden"
- `"comprobante_invalido"` → Similar al anterior
- `"error_validacion"` → "Hubo un problema técnico al validar tu pago"
- `"tiempo_expirado"` → "El tiempo para validar tu pago ha expirado"
- Cualquier otro texto → Se mostrará como "Error: {texto}"

## Ejemplo de Configuración en N8n

### Nodo HTTP Request para Callback

1. **Method**: POST
2. **URL**: `{{$json["callback_url"]}}` (usar el parámetro recibido)
3. **Authentication**: None (el endpoint es público)
4. **Body Content Type**: JSON
5. **Body**:

Para aprobación:
```json
{
  "orderId": "{{$json["order_id"]}}",
  "status": "approved"
}
```

Para rechazo (con condición):
```json
{
  "orderId": "{{$json["order_id"]}}",
  "status": "rejected",
  "rejectionReason": "comprobante_incorrecto"
}
```

## Qué Sucede Después del Callback

Cuando el webhook recibe la respuesta de N8n:

1. **Si status = "approved"**:
   - Actualiza `payment_status` a `'completed'`
   - El trigger `process_completed_order` automáticamente:
     - Crea enrollments para cursos
     - Crea user_subscriptions para suscripciones
   - El trigger `create_payment_on_order_completion` crea el registro en `payments`
   - El usuario es redirigido a `/checkout/success/{orderId}`

2. **Si status = "rejected"**:
   - Actualiza `payment_status` a `'rejected'`
   - Guarda el `rejection_reason` en la orden
   - El usuario ve un mensaje de error específico
   - Puede intentar subir un nuevo comprobante

## Verificación y Logs

### Logs del Edge Function

Para verificar que el callback está funcionando:

```bash
# Ver logs del edge function
supabase functions logs n8n-payment-callback
```

### Logs en Supabase

Los triggers también generan logs que puedes revisar en el dashboard de Supabase.

### Testing Manual

Puedes probar el webhook manualmente con curl:

```bash
curl -X POST https://idjmabhvzupcdygguqzm.supabase.co/functions/v1/n8n-payment-callback \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "uuid-de-una-orden-de-prueba",
    "status": "approved"
  }'
```

## Troubleshooting

### El usuario no recibe actualización

1. Verifica que N8n esté llamando al callback_url correcto
2. Revisa los logs del edge function
3. Verifica que el orderId enviado sea correcto
4. Comprueba que el listener en el frontend esté activo

### Error 400 en el callback

- Verifica que el payload incluya `orderId` y `status`
- Verifica que `status` sea exactamente "approved" o "rejected"

### Error 500 en el callback

- Revisa los logs del edge function
- Verifica que el orderId exista en la base de datos
- Comprueba que el usuario tenga permisos

## Seguridad

El endpoint es público (`verify_jwt = false`) porque es llamado por N8n. Para añadir seguridad adicional:

1. Considera añadir un secret compartido entre N8n y el edge function
2. Valida la IP de origen si N8n tiene IP fija
3. Implementa rate limiting si es necesario
