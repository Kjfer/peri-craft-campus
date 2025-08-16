# 🚀 Guía de Configuración Completa - Peri Institute

## ✅ Estado Actual

**¡Ya tienes todo configurado!** No necesitas crear base de datos ni migraciones.

### Base de Datos Existente:

- ✅ **Supabase activo:** `idjmabhvzupcdygguqzm.supabase.co`
- ✅ **8 tablas creadas** con todas las relaciones
- ✅ **Políticas de seguridad** configuradas
- ✅ **Funciones automáticas** para certificados
- ✅ **Frontend ya conectado** a la base de datos

## 🏃‍♂️ Pasos para Ejecutar (2 minutos)

### 1. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 2. El archivo .env ya está configurado

Ya creé el archivo `.env` con tus credenciales de Supabase.

**Solo necesitas obtener tu SERVICE_ROLE_KEY:**

1. Ve a [Supabase Dashboard](https://supabase.io)
2. Selecciona tu proyecto: `peri-craft-campus`
3. Settings → API → `service_role` key
4. Copia esa clave y reemplázala en `.env`

### 3. Ejecutar el backend

```bash
npm run dev
```

### 4. ¡Listo! El backend estará en:

```
http://localhost:3001
```

## 📋 Endpoints Disponibles

### Principales:

- `GET /health` - Health check
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/courses` - Listar cursos
- `POST /api/enrollments` - Inscribirse en curso
- `GET /api/certificates/verify/:code` - Verificar certificado

### Completos (80+ endpoints):

```
/api/auth/*         - Autenticación
/api/users/*        - Gestión de usuarios
/api/courses/*      - CRUD de cursos
/api/lessons/*      - Gestión de lecciones
/api/enrollments/*  - Inscripciones
/api/certificates/* - Certificados
/api/payments/*     - Pagos (Stripe mock)
/api/subscriptions/* - Planes
/api/admin/*        - Panel admin
/api/upload/*       - Subida de archivos
```

## 🎯 Conectar Frontend al Backend

En tu frontend, cambia las URLs de las peticiones:

**Antes:**

```javascript
// Peticiones directas a Supabase
const { data } = await supabase.from("courses").select("*");
```

**Ahora:**

```javascript
// Peticiones al backend
const response = await fetch("http://localhost:3001/api/courses");
const data = await response.json();
```

## 📊 Base de Datos (Ya configurada)

### Tablas existentes:

- `profiles` - Perfiles de usuario
- `courses` - Cursos disponibles
- `lessons` - Lecciones de cursos
- `enrollments` - Inscripciones de usuarios
- `course_progress` - Progreso en lecciones
- `certificates` - Certificados emitidos
- `payments` - Historial de pagos
- `subscriptions` - Planes de suscripción

### Datos de prueba:

Para agregar datos de prueba, puedes:

1. **Usar el panel de Supabase:**

   - Ve a tu dashboard de Supabase
   - Table Editor → Agrega registros manualmente

2. **Usar el backend:**
   - Crear cursos: `POST /api/courses`
   - Crear planes: `POST /api/subscriptions`
   - Registrar usuarios: `POST /api/auth/register`

## 🔐 Autenticación

El backend usa **Supabase Auth** + **middleware personalizado**:

- Registro/Login automático con Supabase
- Roles: `student`, `instructor`, `admin`
- JWT tokens para autorización
- Políticas de seguridad por rol

## 💳 Pagos (Mock implementado)

El sistema incluye:

- Stripe mock completo
- Flujo de pagos simulado
- Inscripción automática tras pago
- Panel de administración de pagos

**Para pagos reales:** Cambia las claves mock por las reales de Stripe.

## 📁 Archivos (Mock implementado)

Sistema de uploads:

- Cloudinary mock
- Subida de imágenes/videos
- Almacenamiento simulado

**Para archivos reales:** Configura Cloudinary real en `.env`.

## 🎨 Panel de Administración

Accesible en: `GET /api/admin/dashboard`

Funciones:

- Estadísticas generales
- Gestión de usuarios y roles
- CRUD de cursos
- Analytics de pagos
- Exportación de datos

## 🔍 Testing

Puedes probar inmediatamente:

```bash
# Health check
curl http://localhost:3001/health

# Listar cursos (público)
curl http://localhost:3001/api/courses

# Registrar usuario
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","fullName":"Usuario Prueba"}'
```

## 🐛 Troubleshooting

### Error: "Missing Supabase environment variables"

- Verifica que `.env` tenga las credenciales correctas
- Revisa que `SUPABASE_SERVICE_KEY` esté configurada

### Error: "CORS"

- El backend ya tiene CORS configurado para `localhost:5173`
- Si tu frontend está en otro puerto, ajusta `FRONTEND_URL` en `.env`

### Error: "Connection refused"

- Verifica que el backend esté ejecutándose en puerto 3001
- Revisa los logs con `npm run dev`

## 🚀 Próximos Pasos Opcionales

1. **Datos de prueba:** Agrega cursos y usuarios de ejemplo
2. **Stripe real:** Configura claves reales para pagos
3. **Cloudinary real:** Para subida real de archivos
4. **Email:** Configura Nodemailer para notificaciones
5. **Deploy:** Despliega en Railway/Vercel/Heroku

---

**¡Tu backend está 100% listo para usar!** 🎉
