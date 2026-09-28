<div align="center">

# 🎬 Pantalla Mágica

### Plataforma web para la administración y operación integral de un cine

Aplicación desarrollada con Angular y Supabase que centraliza la gestión de películas, funciones, salas, ventas, entradas, clientes y empleados.

[Ver aplicación desplegada](https://pantallamagica-25cb8.web.app) · [Repositorio en GitHub](https://github.com/keilaaristimuno/Cine-prograIV.git)

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Hosting-FFCA28?logo=firebase&logoColor=black)
![Estado](https://img.shields.io/badge/Estado-Módulo%201%20Completado-8B5CF6)

</div>

---

## Descripción

**Pantalla Mágica** es una aplicación web orientada a la administración y operación de un cine, desarrollada en el marco de la materia **Programación IV** (Tecnicatura Universitaria en Programación - UTN).

El sistema contempla diferentes experiencias según el tipo de usuario:

* **Visitantes / Anónimos:** Consultarán la cartelera pública y podrán comprar entradas.
* **Clientes:** Usuarios registrados con perfil propio que podrán adquirir entradas, acumular crédito y gestionar sus operaciones.
* **Empleados:** Operadores del cine que validarán entradas y entregas de Candy mediante códigos QR.
* **Administradores:** Gestión de películas, salas, funciones, promociones y reportes del cine.

El proyecto se desarrolla de forma modular y progresiva. Al finalizar el **Módulo 1**, se encuentran plenamente operativas la autenticación, la gestión de perfiles con roles, la seguridad de rutas y el panel administrativo de películas.

---

## Estado actual del proyecto

### Funcionalidades implementadas (Módulo 1 cerrado)

* [x] **Arquitectura moderna:** Angular 22 con componentes standalone y manejo reactivo de estado mediante **Signals** (`signal`, `computed`).
* [x] **Autenticación completa:** Registro e inicio de sesión integrados con **Supabase Auth**.
* [x] **Formulario de registro ampliado:** Captura y valida datos personales requeridos (nombre, apellido, correo, contraseña, fecha de nacimiento, tipo de sangre, color de ojos y días de vacaciones).
* [x] **Validación de fecha de nacimiento:** Restricción de selección hasta la fecha actual mediante atributo `[max]` en HTML y validador reactivo personalizado en TypeScript (`validadorFechaNoFutura`), impidiendo fechas futuras.
* [x] **Gestión segura de perfiles en el servidor:** Trigger en PostgreSQL (`tr_crear_perfil_nuevo_usuario`) ejecutado con `SECURITY DEFINER` tras el alta en `auth.users`, asignando de forma estricta y segura `rol = 'cliente'` y `credito = 0.00`.
* [x] **Seguridad de rutas:** Guard funcional `adminGuard` (`CanActivateFn`) que sincroniza asíncronamente la sesión (`asegurarSesionLista()`) y protege `/admin` y sus rutas hijas.
* [x] **Manejo de acceso denegado:** Redirección automática de usuarios no autorizados al inicio de sesión con advertencia explicativa.
* [x] **Control de sesión en el layout:** Barra superior en el panel administrativo que muestra la identidad y badge de rol del usuario autenticado, junto con el botón funcional de **Cerrar sesión** (`cerrarSesion()`).
* [x] **Panel administrativo de películas (CRUD):**
  * Listado de películas con vista previa de datos y estado.
  * Formulario reactivo reutilizable para alta y edición de películas.
  * Carga y actualización de pósteres en **Supabase Storage** (bucket `posters`) con validación de tipo y tamaño.
  * Publicación y ocultamiento de películas.
  * Eliminación lógica conservando integridad de datos para futuras ventas.
* [x] **Despliegue continuo:** Aplicación publicada en **Firebase Hosting**.

### Próximos pasos y funcionalidades en desarrollo

* [ ] **Módulo 2 (Próximo):** Catálogo público de películas (cartelera dinámica, banner principal, top películas vistas, búsqueda y filtros por género) y página de detalle con trailer.
* [ ] **Páginas específicas de cliente:** Panel de mi cuenta, historial de compras y consulta de crédito *(aún no implementadas)*.
* [ ] **Páginas específicas de empleado:** Escáner e interfaz de validación de entradas por código QR *(aún no implementadas)*.
* [ ] **Gestión de salas y butacas:** Configuración de salas (2D, 3D, 4D, 5D) y mapa interactivo de asientos.
* [ ] **Gestión de funciones y horarios:** Programación de funciones con validación de salas y tiempos de limpieza entre funciones.
* [ ] **Módulo de compra:** Selección de función, butacas, productos de Candy y validación de restricción de edad (+13/+18 para registrados).
* [ ] **Generación de entradas:** Emisión de entradas con código QR único para ingreso y Candy.
* [ ] **Fidelización y promociones:** Sistema de puntos, cupones y crédito por cancelaciones.
* [ ] **Reportes y métricas:** Estadísticas de venta y ocupación.

---

## Roles y permisos

| Rol | Estado en la aplicación | Permisos y accesos |
| :--- | :--- | :--- |
| `administrador` | **Activo e implementado** | Acceso irrestricto al panel `/admin`. Crea, edita, publica, oculta y elimina películas. Gestionará salas, funciones y reportes. |
| `empleado` | **Modelo definido en BD** *(vista operativa en desarrollo)* | Diseñado para la validación de accesos a sala y retiro de Candy mediante escaneo de QR. |
| `cliente` | **Modelo definido en BD** *(panel de cuenta en desarrollo)* | Rol por defecto al registrarse. Podrá consultar la cartelera, comprar entradas y administrar su crédito. |
| **Anónimo** | **En desarrollo (Módulo 2)** | Visitante sin autenticar que podrá explorar la cartelera pública y comenzar el proceso de compra. |

---

## Tecnologías utilizadas

### Frontend
* **Angular 22:** Componentes Standalone, nuevo sistema de flujo de control (`@if`, `@for`), Signals y Computed Signals.
* **TypeScript 5:** Tipado estricto e interfaces de dominio.
* **Angular Router:** Carga perezosa (*lazy loading*) y guards funcionales (`CanActivateFn`).
* **Angular Reactive Forms:** Formularios con validadores sincronizados y tipados.
* **SCSS:** Estilos modulares con paleta cinematográfica personalizada.

### Backend y Base de Datos (BaaS)
* **Supabase:**
  * **Authentication:** Gestión de usuarios y credenciales cifradas (`auth.users`).
  * **PostgreSQL:** Base de datos relacional con trigger PL/pgSQL y funciones `SECURITY DEFINER`.
  * **Storage:** Bucket `posters` para almacenamiento de imágenes de películas.
  * **Row Level Security (RLS):** Políticas de seguridad a nivel de fila para control de acceso a datos.

### Despliegue y Control de Versiones
* **Firebase Hosting:** Alojamiento y distribución en la nube de la aplicación web.
* **Git & GitHub:** Control de versiones del código fuente.

---

## Arquitectura del proyecto

La aplicación sigue una estructura modular orientada a funcionalidades (*feature-based*):

```text
src/
└── app/
    ├── core/
    │   ├── guards/
    │   │   └── admin.guard.ts         # Protección funcional de rutas administrativas
    │   ├── modelos/
    │   │   ├── pelicula.ts            # Interfaces y tipos del catálogo de películas
    │   │   └── usuario.ts             # Roles, tipos y modelo de perfil de usuario
    │   └── servicios/
    │       ├── servicio-auth.ts       # Gestión de sesión, signals y autenticación
    │       ├── servicio-peliculas.ts  # CRUD de películas y subida a Storage
    │       └── servicio-supabase.ts   # Conexión cliente con Supabase
    │
    ├── features/
    │   ├── autenticacion/
    │   │   └── paginas/
    │   │       ├── inicio-sesion/     # Login con bifurcación por rol
    │   │       └── registro/          # Registro con perfil completo y validaciones
    │   │
    │   └── admin/
    │       ├── layouts/
    │       │   └── admin-layout/      # Layout del panel con usuario y botón de logout
    │       │
    │       └── pages/
    │           ├── dashboard-admin/   # Vista de resumen administrativo
    │           └── peliculas/
    │               ├── listado-peliculas/    # Grilla/tabla de administración
    │               └── formulario-pelicula/  # Alta y edición con upload de póster
    │
    ├── app.config.ts                  # Configuración global e inyección de dependencias
    └── app.routes.ts                  # Enrutamiento con lazy loading y guards
```

---

## Modelo de datos actual

### `auth.users`
Tabla interna administrada por Supabase Auth. Almacena identificador único (`id`), correo, contraseña encriptada y metadatos del usuario (`raw_user_meta_data`).

### `public.perfiles`
Extensión de datos de usuario vinculada mediante clave foránea a `auth.users(id)`:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `usuario_id` | `UUID` (PK, FK) | Identificador que referencia a `auth.users.id` (`ON DELETE CASCADE`). |
| `rol` | `text` | Rol del usuario (`'administrador'`, `'empleado'`, `'cliente'`). |
| `nombre` | `text` | Nombre del usuario. |
| `apellido` | `text` | Apellido del usuario. |
| `fecha_nacimiento`| `date` | Fecha de nacimiento (restringida a fechas no futuras). |
| `tipo_sangre` | `text` | Grupo sanguíneo (`'A+'`, `'O+'`, etc.). |
| `color_ojos` | `text` | Color de ojos. |
| `dias_vacaciones` | `integer` | Días de vacaciones disponibles. |
| `credito` | `numeric(10,2)` | Saldo a favor para compras en el cine (inicia en `0.00`). |
| `creado_en` | `timestamptz` | Marca temporal de creación del perfil. |

### `public.peliculas`
Catálogo de películas administrado por los usuarios autorizados:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador único de la película. |
| `nombre` | `text` | Título de la película. |
| `sinopsis` | `text` | Sinopsis argumental. |
| `duracion_minutos` | `integer` | Duración expresada en minutos. |
| `fecha_estreno` | `date` | Fecha de estreno en salas. |
| `clasificacion_edad`| `text` | Calificación por edades (`'ATP'`, `'+13'`, `'+18'`). |
| `esta_activa` | `boolean` | Visibilidad pública (publicada / oculta). |
| `generos` | `text[]` | Array con los géneros cinematográficos aplicables. |
| `imagen_url` | `text` | URL pública del póster en Supabase Storage. |
| `creado_por` | `UUID` (FK) | Referencia al usuario administrador creador. |
| `creado_en` | `timestamptz` | Fecha de creación del registro. |

---

## Decisiones técnicas destacadas

1. **Gestión de perfiles mediante Trigger exclusivo (Alternativa A):**
   Para evitar problemas de concurrencia y vulnerabilidades en el cliente, la creación de la fila en `public.perfiles` se delega en su totalidad al trigger PostgreSQL `tr_crear_perfil_nuevo_usuario`. De esta forma, el rol `'cliente'` y el crédito inicial `0.00` quedan fijados por la base de datos de manera inviolable.
2. **Signals para reactividad granular:**
   `ServicioAuth` expone el estado de la sesión mediante Signals (`usuarioActual`, `perfilActual`) y computed signals (`esAdmin`, `rolActual`). Esto elimina suscripciones manuales con RxJS y previene fugas de memoria.
3. **Sincronización en Guards (`asegurarSesionLista`):**
   Al recargar una ruta administrativa (`/admin`) con F5, la lectura de la sesión en el almacenamiento local es asíncrona. El `adminGuard` espera a que dicha lectura finalice antes de decidir si redirige, evitando falsos rechazos de acceso.
4. **Validación cronológica segura de fechas:**
   La verificación de la fecha de nacimiento se realiza comparando strings ISO (`AAAA-MM-DD`). Este enfoque evita desfases por conversiones de huso horario local (UTC vs. hora de Argentina).
5. **Borrado lógico:**
   Las películas no se eliminan físicamente de la base de datos, garantizando que el historial de funciones y futuras ventas mantenga su integridad referencial.

---

## Instalación y ejecución local

### Requisitos previos
* [Node.js](https://nodejs.org/) (versión 20 o superior recomendada).
* [npm](https://www.npmjs.com/).
* [Angular CLI](https://angular.dev/) instalado globalmente o mediante `npx`.

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/keilaaristimuno/Cine-prograIV.git
   cd pantalla-magica
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Variables de entorno:**
   Verificar o crear el archivo `src/environments/environment.ts` con los datos de conexión a Supabase:
   ```typescript
   export const environment = {
     production: false,
     supabaseUrl: 'https://TU-PROYECTO.supabase.co',
     supabasePublishableKey: 'TU-CLAVE-PUBLICA-ANON'
   };
   ```

4. **Ejecutar el servidor de desarrollo:**
   ```bash
   ng serve
   ```
   Acceder desde el navegador a `http://localhost:4200`.

---

## Compilación y Despliegue

* **Compilar para producción:**
  ```bash
  npm run build
  ```
  Los archivos optimizados se generan en el directorio `dist/`.

* **Desplegar a Firebase Hosting:**
  ```bash
  firebase deploy
  ```

---

## Autor

Proyecto académico desarrollado por **Keila Aristimuño** para la carrera **Tecnicatura Universitaria en Programación (UTN)** — Cátedra de Programación IV (2025/2026).
