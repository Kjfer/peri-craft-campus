# Configuración del Sistema de Email y Notificaciones

## Variables de Entorno Requeridas

Agrega estas variables a tu archivo `.env` en el backend:

```env
# Sistema de Email
EMAIL_SERVICE_URL=https://api.sendgrid.v3/mail/send
EMAIL_API_KEY=tu_sendgrid_api_key
FROM_EMAIL=noreply@peri-institute.com

# Cron Jobs
ENABLE_CRON_JOBS=true

# Supabase (ya deberías tenerlas)
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

## Configuración por Servicio de Email

### SendGrid (Recomendado)
1. Ve a [SendGrid](https://sendgrid.com) y crea una cuenta
2. Genera una API Key
3. Configura:
```env
EMAIL_SERVICE_URL=https://api.sendgrid.com/v3/mail/send
EMAIL_API_KEY=SG.tu_api_key_aqui
```

### Mailgun
```env
EMAIL_SERVICE_URL=https://api.mailgun.net/v3/tu-dominio.com/messages
EMAIL_API_KEY=tu_mailgun_api_key
```

### Amazon SES
```env
EMAIL_SERVICE_URL=https://email.us-east-1.amazonaws.com/
EMAIL_API_KEY=tu_aws_access_key
```

## Configuración de la Edge Function

1. Navega a tu proyecto de Supabase
2. Ve a Edge Functions
3. Crea una nueva función llamada `send-email`
4. Sube el código que está en `supabase/functions/send-email/index.ts`
5. Configura las variables de entorno en Supabase:
   - `EMAIL_SERVICE_URL`
   - `EMAIL_API_KEY`
   - `FROM_EMAIL`

## Configuración de Cron Jobs

Los cron jobs se ejecutan automáticamente cuando:
- `NODE_ENV=production` 
- O `ENABLE_CRON_JOBS=true`

### Horarios Programados:
- **Recordatorios de renovación**: Diario a las 9:00 AM
- **Limpieza de notificaciones**: Domingos a las 2:00 AM
- **Verificación de suscripciones expiradas**: Diario a la 1:00 AM

### Control Manual:
```bash
# Ver estado de los jobs
GET /api/admin/cron/status

# Ejecutar job manualmente
POST /api/admin/cron/run/renewalReminders
POST /api/admin/cron/run/notificationCleanup

# Controlar jobs
POST /api/admin/cron/start/renewalReminders
POST /api/admin/cron/stop/renewalReminders
```

## Migración de Base de Datos

Ejecuta la migración SQL para crear las tablas de notificaciones:

```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: supabase/migrations/20241213_notifications_system.sql
```

## Pruebas del Sistema

### 1. Probar Email Service
```javascript
// En tu backend, crear un endpoint de prueba:
const emailService = require('./services/emailService');

// Probar email de pago
await emailService.sendPaymentConfirmation(userId, orderData);

// Probar email de suscripción
await emailService.sendSubscriptionActivated(userId, subscriptionData);
```

### 2. Probar Cron Jobs
```bash
# Ejecutar recordatorios manualmente
curl -X POST http://localhost:3001/api/admin/cron/run/renewalReminders

# Ver estado de jobs
curl http://localhost:3001/api/admin/cron/status
```

### 3. Probar Notificaciones
Completa un pago y verifica que:
- Se crea la notificación en base de datos
- Se envía el email de confirmación
- Si es suscripción, se envía email de activación

## Monitoreo y Logs

Los logs aparecerán en tu consola del servidor:
```
🔔 Running renewal reminders job...
✅ Sent 5 renewal reminders
🧹 Running notification cleanup job...
✅ Cleaned up 127 old notifications
```

## Troubleshooting

### Error: "Email service not configured"
- Verifica que `EMAIL_SERVICE_URL` y `EMAIL_API_KEY` estén configuradas
- Asegúrate de que la Edge Function esté desplegada

### Los cron jobs no se ejecutan
- Verifica `ENABLE_CRON_JOBS=true` o `NODE_ENV=production`
- Revisa los logs del servidor

### Los emails no llegan
- Verifica el spam/promociones
- Revisa los logs de la Edge Function
- Confirma que el dominio de email esté configurado

## Personalización

Puedes personalizar los templates de email editando los métodos en `emailService.js`:
- `getPaymentConfirmationTemplate()`
- `getSubscriptionActivatedTemplate()`
- `getRenewalReminderTemplate()`