# Peri Institute Backend API

Backend completo para la plataforma educativa Peri Institute - Cursos de moda y confección online.

## 🚀 Características

- ✅ Autenticación completa (registro, login, logout, reset password)
- ✅ Gestión de usuarios y perfiles
- ✅ CRUD completo de cursos
- ✅ Sistema de lecciones con progreso
- ✅ Inscripciones y seguimiento de progreso
- ✅ Generación y verificación de certificados
- ✅ Sistema de pagos (integración con Stripe mock)
- ✅ Planes de suscripción
- ✅ Panel de administración completo
- ✅ Subida de archivos (imágenes, videos)
- ✅ Estadísticas y analytics
- ✅ Middleware de seguridad y validación
- ✅ Manejo de errores robusto

## 🛠 Tecnologías

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Supabase** - Base de datos y autenticación
- **JWT** - Autenticación con tokens
- **Multer** - Subida de archivos
- **Cloudinary** - Almacenamiento de archivos (mock)
- **Stripe** - Procesamiento de pagos (mock)
- **Helmet** - Seguridad HTTP
- **CORS** - Política de origen cruzado
- **Morgan** - Logging de peticiones

## 📁 Estructura del Proyecto

```
backend/
├── config/
│   └── database.js          # Configuración de Supabase
├── middleware/
│   ├── auth.js              # Autenticación y autorización
│   ├── errorHandler.js      # Manejo de errores global
│   └── notFound.js          # Middleware para endpoints no encontrados
├── routes/
│   ├── auth.js              # Rutas de autenticación
│   ├── users.js             # Rutas de usuarios
│   ├── courses.js           # Rutas de cursos
│   ├── lessons.js           # Rutas de lecciones
│   ├── enrollments.js       # Rutas de inscripciones
│   ├── certificates.js      # Rutas de certificados
│   ├── payments.js          # Rutas de pagos
│   ├── subscriptions.js     # Rutas de suscripciones
│   ├── admin.js             # Rutas de administración
│   └── upload.js            # Rutas de subida de archivos
├── .env.example             # Variables de entorno ejemplo
├── package.json             # Dependencias y scripts
└── server.js               # Servidor principal
```

## ⚙️ Configuración

1. **Clonar e instalar dependencias:**

```bash
cd backend
npm install
```

2. **Configurar variables de entorno:**

```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

3. **Configurar Supabase:**

   - Crear proyecto en [Supabase](https://supabase.io)
   - Copiar URL y claves a `.env`
   - Ejecutar migraciones desde la carpeta `supabase/`

4. **Iniciar el servidor:**

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🔗 Endpoints Principales

### Autenticación

- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/forgot-password` - Solicitar reset de contraseña
- `POST /api/auth/reset-password` - Resetear contraseña

### Usuarios

- `GET /api/users/profile` - Obtener perfil
- `PUT /api/users/profile` - Actualizar perfil
- `GET /api/users/enrollments` - Obtener inscripciones
- `GET /api/users/certificates` - Obtener certificados
- `GET /api/users/progress` - Obtener progreso de aprendizaje

### Cursos

- `GET /api/courses` - Listar cursos (con filtros)
- `GET /api/courses/:id` - Obtener curso por ID
- `POST /api/courses` - Crear curso (Instructor/Admin)
- `PUT /api/courses/:id` - Actualizar curso (Instructor/Admin)
- `DELETE /api/courses/:id` - Eliminar curso (Admin)
- `GET /api/courses/:id/stats` - Estadísticas de curso

### Lecciones

- `GET /api/lessons/course/:courseId` - Lecciones por curso
- `GET /api/lessons/:id` - Obtener lección
- `POST /api/lessons` - Crear lección (Instructor/Admin)
- `PUT /api/lessons/:id` - Actualizar lección (Instructor/Admin)
- `POST /api/lessons/:id/progress` - Marcar progreso

### Inscripciones

- `POST /api/enrollments` - Inscribirse en curso
- `GET /api/enrollments` - Obtener inscripciones del usuario
- `GET /api/enrollments/course/:courseId` - Inscripción específica
- `DELETE /api/enrollments/:id` - Cancelar inscripción

### Certificados

- `GET /api/certificates/verify/:code` - Verificar certificado (Público)
- `GET /api/certificates` - Obtener certificados del usuario
- `POST /api/certificates` - Generar certificado
- `PUT /api/certificates/:id` - Actualizar certificado (Admin)

### Pagos

- `POST /api/payments/create-intent/course` - Crear intención de pago
- `POST /api/payments/confirm` - Confirmar pago
- `GET /api/payments` - Historial de pagos
- `POST /api/payments/:id/refund` - Reembolsar (Admin)

### Suscripciones

- `GET /api/subscriptions` - Listar planes (Público)
- `POST /api/subscriptions` - Crear plan (Admin)
- `PUT /api/subscriptions/:id` - Actualizar plan (Admin)

### Administración

- `GET /api/admin/dashboard` - Estadísticas generales
- `GET /api/admin/users` - Gestión de usuarios
- `PUT /api/admin/users/:id/role` - Cambiar rol de usuario
- `GET /api/admin/analytics` - Analytics del sistema
- `GET /api/admin/export/:type` - Exportar datos

### Subida de Archivos

- `POST /api/upload/course-thumbnail` - Subir miniatura de curso
- `POST /api/upload/lesson-video` - Subir video de lección
- `POST /api/upload/avatar` - Subir avatar de usuario
- `POST /api/upload/multiple` - Subir múltiples archivos

## 🔐 Autenticación y Autorización

El API utiliza JWT tokens y roles de usuario:

- **student**: Usuario regular con acceso a cursos
- **instructor**: Puede crear y gestionar cursos
- **admin**: Acceso completo al sistema

### Headers requeridos:

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## 🛡️ Seguridad

- Rate limiting (100 requests por 15 min por IP)
- Helmet.js para headers de seguridad
- CORS configurado
- Validación de datos de entrada
- Sanitización de parámetros
- Manejo seguro de archivos

## 📊 Base de Datos

El sistema utiliza las siguientes tablas principales:

- `profiles` - Perfiles de usuario
- `courses` - Cursos disponibles
- `lessons` - Lecciones de los cursos
- `enrollments` - Inscripciones de usuarios
- `course_progress` - Progreso en lecciones
- `certificates` - Certificados emitidos
- `payments` - Registro de pagos
- `subscriptions` - Planes de suscripción

## 🔧 Scripts Disponibles

```bash
npm start          # Iniciar servidor en producción
npm run dev        # Iniciar en desarrollo con nodemon
npm test           # Ejecutar tests
```

## 🚨 Manejo de Errores

El API implementa manejo centralizado de errores con:

- Logging detallado
- Respuestas consistentes
- Códigos de estado HTTP apropiados
- Ocultación de detalles internos en producción

## 📈 Monitoreo y Logging

- Morgan para logging de requests HTTP
- Console.log estructurado para errores
- Health check endpoint: `GET /health`

## 🔄 Versionado de API

Versión actual: **v1**
Base URL: `/api/`

## 📝 Notas de Implementación

1. **Pagos**: Actualmente utiliza Stripe mock. Para producción, integrar Stripe real.
2. **Archivos**: Utiliza Cloudinary mock. Para producción, configurar Cloudinary real.
3. **Emails**: Configurar Nodemailer para notificaciones por email.
4. **Cache**: Considerar implementar Redis para cacheo.
5. **Websockets**: Para notificaciones en tiempo real.

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

---

**Desarrollado para Peri Institute** 🎓✂️
