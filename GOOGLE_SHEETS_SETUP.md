# Configuración de Google Sheets para Registro de Pagos

Este documento explica cómo configurar la integración con Google Sheets usando OAuth2.

## Requisitos Previos

Ya debes tener:
- ✅ Credenciales OAuth2 de Google Cloud Console
- ✅ Client ID
- ✅ Client Secret  
- ✅ Refresh Token

## Paso 1: Preparar tu Hoja de Cálculo

1. Crea o abre tu hoja de cálculo de Google Sheets
2. Asegúrate de que tenga estos encabezados en la primera fila:

```
ID_USUARIO | NOMBRE | CORREO | MONTO | MONEDA | TIPO_PAGO | ID_TRANSACCION | METODO_PAGO | FECHA_PAGO | HORA_PAGO
```

3. Anota:
   - **Spreadsheet ID**: Lo encuentras en la URL de tu hoja
     - URL: `https://docs.google.com/spreadsheets/d/1AbC...XyZ/edit`
     - ID: `1AbC...XyZ`
   - **Nombre de la hoja**: Por defecto es "Hoja 1" o el nombre que le hayas puesto (ej: "Pagos")

## Paso 2: Configurar Secretos en Supabase

Ve a tu proyecto de Supabase y agrega estos secretos:

### Secretos Requeridos:

1. **GOOGLE_SHEETS_CLIENT_ID**
   - Tu Client ID de OAuth2

2. **GOOGLE_SHEETS_CLIENT_SECRET**
   - Tu Client Secret de OAuth2

3. **GOOGLE_SHEETS_REFRESH_TOKEN**
   - Tu Refresh Token de OAuth2

4. **GOOGLE_SHEETS_SPREADSHEET_ID**
   - El ID de tu hoja de cálculo (ejemplo: `1AbC...XyZ`)

5. **GOOGLE_SHEETS_SHEET_NAME** (opcional)
   - Nombre de la pestaña donde se registrarán los pagos
   - Por defecto: "Pagos"

## Paso 3: Verificar Permisos de OAuth2

Asegúrate de que tu aplicación de OAuth2 tenga estos scopes:
- `https://www.googleapis.com/auth/spreadsheets`

## Paso 4: Probar la Integración

1. Realiza un pago de prueba en tu aplicación
2. Verifica que se haya agregado una nueva fila en tu hoja de cálculo
3. Los datos deben aparecer en este formato:

| ID_USUARIO | NOMBRE | CORREO | MONTO | MONEDA | TIPO_PAGO | ID_TRANSACCION | METODO_PAGO | FECHA_PAGO | HORA_PAGO |
|------------|--------|--------|-------|--------|-----------|----------------|-------------|------------|-----------|
| uuid-123... | Juan Pérez | juan@email.com | 50.00 | PEN | course | TXN-12345 | yape_qr | 29/09/2025 | 14:30 |

## Estructura de Datos

### payment_type
- `course`: Pago por curso individual
- `subscription`: Pago por suscripción

### payment_method
- `yape_qr`: Yape QR
- `paypal`: PayPal
- `googlepay`: Google Pay
- `mercadopago`: MercadoPago
- `card`: Tarjeta

## Solución de Problemas

### Error: "Missing Google OAuth2 credentials"
- Verifica que todos los secretos estén configurados correctamente en Supabase

### Error: "Failed to get access token"
- Verifica que tu Refresh Token sea válido
- Asegúrate de que el Client ID y Client Secret sean correctos

### Error: "Failed to append to sheet"
- Verifica que el Spreadsheet ID sea correcto
- Asegúrate de que el nombre de la hoja exista
- Verifica que la aplicación OAuth2 tenga los permisos necesarios

### Los pagos no se registran
- Revisa los logs de la edge function `record-payment-sheets` en Supabase
- Verifica que la integración esté habilitada (GOOGLE_SHEETS_SPREADSHEET_ID configurado)

## Notas Importantes

- ⚠️ Los errores en el registro de Google Sheets NO interrumpen el flujo de pago
- ✅ Si falla el registro, el pago se procesa normalmente
- 📊 Los datos se agregan automáticamente después de confirmar cada pago
- 🔒 Las credenciales OAuth2 se almacenan de forma segura en Supabase Secrets
