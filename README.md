<div align="center">

# 🎬 Pantalla Mágica

### Plataforma web para la administración y operación integral de un cine

Aplicación desarrollada con Angular y Supabase que centraliza la gestión de películas, funciones, salas, ventas, entradas, clientes y empleados.

[Ver aplicación desplegada](https://pantallamagica-25cb8.web.app) · [Repositorio en GitHub](https://github.com/keilaaristimuno/Cine-prograIV.git)

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Hosting-FFCA28?logo=firebase&logoColor=black)
![Estado](https://img.shields.io/badge/Estado-Módulo%202%20Completado-8B5CF6)

</div>

---

## Descripción

**Pantalla Mágica** es una aplicación web orientada a la administración y operación de un cine, desarrollada en el marco de la materia **Programación IV** (Tecnicatura Universitaria en Programación - UTN).

El sistema contempla diferentes experiencias según el tipo de usuario:

* **Visitantes / Anónimos:** Consultan la cartelera pública, buscan por título, filtran por género, revisan próximos estrenos y acceden a las fichas técnicas detalladas de las películas.
* **Clientes:** Usuarios registrados con perfil propio que acceden a la cartelera y detalles con sesión activa. Próximamente podrán adquirir entradas, acumular crédito y gestionar sus operaciones.
* **Empleados:** Operadores del cine que validarán entradas y entregas de Candy mediante códigos QR *(módulo futuro)*.
* **Administradores:** Gestión integral de películas, y a futuro salas, funciones, promociones y reportes del cine.

El proyecto se desarrolla de forma modular y progresiva. Al finalizar el **Módulo 2**, se encuentran plenamente operativas la autenticación, la gestión de perfiles con roles, la seguridad de rutas, el panel administrativo de películas, la cartelera pública con filtros reactivos y la página de detalle individual de películas.

---

## Estado actual del proyecto

### Funcionalidades implementadas

#### Módulo 1: Autenticación, Perfiles y Administración de Películas
* [x] **Arquitectura moderna:** Angular 22 con componentes standalone y manejo reactivo de estado mediante **Signals** (`signal`, `computed`).
* [x] **Autenticación completa:** Registro e inicio de sesión integrados con **Supabase Auth**.
* [x] **Formulario de registro ampliado:** Captura y valida datos personales requeridos (nombre, apellido, correo, contraseña, fecha de nacimiento, tipo de sangre, color de ojos y días de vacaciones).
* [x] **Validación de fecha de nacimiento:** Restricción de selección hasta la fecha actual mediante atributo `[max]` en HTML y validador reactivo personalizado en TypeScript (`validadorFechaNoFutura`), impidiendo fechas futuras.
* [x] **Gestión segura de perfiles en el servidor:** Trigger en PostgreSQL (`tr_crear_perfil_nuevo_usuario`) ejecutado con `SECURITY DEFINER` tras el alta en `auth.users`, asignando automáticamente `rol = 'cliente'` y `credito = 0.00` desde la base de datos.
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

#### Módulo 2: Cartelera Pública, Filtros y Detalle de Película
* [x] **Layout público (`PublicLayout`):**
  * Navbar interactivo y reactivo al estado de autenticación (anónimo: iniciar sesión/registrarse; cliente: nombre, badge de rol y cerrar sesión; administrador: botón de acceso a panel admin).
  * Contenedor central `<router-outlet />` para las páginas públicas.
  * Footer institucional con información de la plataforma.
* [x] **Cartelera pública (`Cartelera`):**
  * Consulta única optimizada a Supabase (`obtenerPeliculasCartelera`) que recupera exclusivamente películas activas (`esta_activa = true`) y no eliminadas (`eliminada_en IS NULL`).
  * Manejo reactivo integral mediante Signals para estados de carga (`cargando`), error con reintento (`mensajeError`), catálogo vacío y datos.
* [x] **Hero dinámico de presentación:**
  * Banner superior que destaca la película más reciente en cartelera con imagen de fondo, metadatos y degradado cinematográfico.
  * Fallback institucional en caso de no contar con películas disponibles.
* [x] **Películas destacadas:**
  * Sección que presenta una selección de hasta 3 títulos disponibles en cartelera actual ordenados cronológicamente.
* [x] **Buscador interactivo:**
  * Búsqueda por título en tiempo real (case-insensitive) con botón para limpiar la búsqueda.
* [x] **Filtros multigénero:**
  * Selección mediante chips interactivos con semántica OR (coincide si la película incluye al menos uno de los géneros seleccionados) combinados mediante AND con el buscador de texto.
  * Chip "Todos" para restablecer la selección de géneros.
* [x] **Sección Próximamente (Próximos estrenos):**
  * Separación cronológica automática de títulos activos cuya `fechaEstreno` es posterior a la fecha del día local del usuario.
  * Tarjetas informativas con fecha de estreno formateada (`DD/MM/AAAA`) y etiqueta de próximo estreno.
* [x] **Tarjeta de película reutilizable (`TarjetaPelicula`):**
  * Componente presentacional con póster, badges de clasificación por edad (ATP, +13, +18), duración en horas/minutos, géneros y enlace `routerLink` hacia el detalle.
* [x] **Página de detalle individual (`DetallePelicula`):**
  * Ruta dinámica pública `/pelicula/:id` cargada bajo demanda mediante Lazy Loading (`loadComponent`).
  * Extracción del parámetro `:id` mediante `ActivatedRoute.snapshot.paramMap`.
  * Consulta pública específica `obtenerPeliculaPublicaPorId(id)` que recupera únicamente información de películas publicadas y activas.
  * Presentación de datos reales existentes: póster, título, sinopsis, duración, calificación por edades, géneros y fecha de estreno.
  * Diferenciación de estado informativa: badge "En cartelera" vs. "Próximo estreno" con aviso de fecha programada.
  * Cobertura de estados: carga, error con reintento y pantalla informativa cuando la película no existe o no está disponible.
  * Navegación declarativa mediante `RouterLink` para volver a la cartelera (`/`).

### Próximos pasos y funcionalidades en desarrollo

* [ ] **Módulo 3 (Próximo):** Gestión de salas (2D, 3D, 4D, 5D), mapa interactivo de asientos y programación de funciones con horarios y tiempos de limpieza.
* [ ] **Páginas específicas de cliente:** Panel de mi cuenta, historial de compras y consulta de crédito *(aún no implementadas)*.
* [ ] **Páginas específicas de empleado:** Escáner e interfaz de validación de entradas por código QR *(aún no implementadas)*.
* [ ] **Módulo de compra y reservas:** Selección de función, butacas, productos de Candy y validación de restricción de edad (+13/+18 para registrados).
* [ ] **Generación de entradas:** Emisión de entradas con código QR único para ingreso a sala y retiro en Candy.
* [ ] **Fidelización y promociones:** Sistema de puntos, cupones y crédito por cancelaciones.
* [ ] **Reportes y métricas:** Estadísticas de venta y ocupación, incluyendo el cálculo real de Top 3 de películas más vistas/vendidas basado en transacciones.

---

## Roles y permisos

| Rol | Estado en la aplicación | Permisos y accesos |
| :--- | :--- | :--- |
| `administrador` | **Activo e implementado** | Acceso irrestricto al panel `/admin`. Crea, edita, publica, oculta y elimina películas. Próximamente gestionará salas, funciones y reportes. |
| `empleado` | **Modelo definido en BD** *(vista operativa en desarrollo)* | Diseñado para la validación de accesos a sala y retiro de Candy mediante escaneo de QR. |
| `cliente` | **Activo e implementado** | Rol por defecto al registrarse. Dispone de sesión activa, Navbar personalizado y acceso a la cartelera y detalles de películas. La compra de entradas, historial y crédito se implementarán en módulos posteriores. |
| **Anónimo** | **Activo e implementado** | Visitante sin autenticar. Puede explorar la cartelera pública, buscar películas, filtrar por géneros, consultar próximos estrenos y ver fichas de detalle. |

---

## Tecnologías utilizadas

### Frontend
* **Angular 22:** Componentes Standalone, nuevo sistema de flujo de control (`@if`, `@for`), Signals y Computed Signals.
* **TypeScript 5:** Tipado estricto e interfaces de dominio.
* **Angular Router:** Carga perezosa (*lazy loading*), rutas dinámicas con parámetros (`:id`) y guards funcionales (`CanActivateFn`).
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
    │       ├── servicio-peliculas.ts  # CRUD de películas, consultas públicas y Storage
    │       └── servicio-supabase.ts   # Conexión cliente con Supabase
    │
    ├── features/
    │   ├── autenticacion/
    │   │   └── paginas/
    │   │       ├── inicio-sesion/     # Login con bifurcación por rol
    │   │       └── registro/          # Registro con perfil completo y validaciones
    │   │
    │   ├── publico/
    │   │   ├── componentes/
    │   │   │   └── tarjeta-pelicula/  # Tarjeta presentacional reutilizable con routerLink
    │   │   ├── layouts/
    │   │   │   └── public-layout/     # Layout público con Navbar reactivo y Footer
    │   │   └── paginas/
    │   │       ├── cartelera/         # Cartelera, hero, filtros multigénero y próximos estrenos
    │   │       └── detalle-pelicula/  # Ficha técnica pública por ID (/pelicula/:id)
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

1. **Asignación de perfiles mediante Trigger en PostgreSQL:**
   Para evitar problemas de concurrencia y manipulación en el cliente, la creación de la fila en `public.perfiles` se delega en su totalidad al trigger PostgreSQL `tr_crear_perfil_nuevo_usuario`. De esta forma, el rol `'cliente'` y el crédito inicial `0.00` se asignan automáticamente desde la base de datos.
2. **Signals + `computed` para estado reactivo derivado:**
   La cartelera pública descarga una única vez el catálogo activo en un signal principal `peliculas()`. A partir de allí, `computed()` deriva de forma reactiva y memoizada las películas en cartelera, próximos estrenos, hero dinámico, películas destacadas y el catálogo filtrado, evitando re-renderizados innecesarios y prescindiendo de suscripciones manuales con RxJS.
3. **Filtrado local en memoria sin consultas por tecla:**
   El buscador por nombre y la selección multigénero (con semántica OR) se ejecutan localmente sobre el catálogo cargado en memoria. Esto brinda una experiencia de usuario inmediata (latencia cero) y previene la saturación de lecturas sobre la base de datos al tipear o alternar filtros.
4. **Separación cronológica mediante fecha local:**
   La clasificación entre películas en cartelera y próximos estrenos se realiza comparando `fechaEstreno` contra la fecha del día local del usuario (`getFullYear()`, `getMonth() + 1`, `getDate()`). Esto previene desfasajes de huso horario que provocaría el uso de `toISOString()` en husos horarios como el de Argentina (UTC-3).
5. **Consulta pública específica (`obtenerPeliculaPublicaPorId`):**
   La vista pública utiliza una consulta que exige explícitamente `esta_activa = true` y `eliminada_en IS NULL`. De este modo se impide mostrar información de películas inactivas u ocultas aunque un usuario ingrese manualmente su UUID en la URL, mientras que el método administrativo `obtenerPeliculaPorId` mantiene la capacidad de editar títulos en borrador.
6. **Sincronización en Guards (`asegurarSesionLista`):**
   Al recargar una ruta administrativa (`/admin`) con F5, la lectura de la sesión en el almacenamiento local es asíncrona. El `adminGuard` espera a que dicha lectura finalice antes de decidir si redirige, evitando falsos rechazos de acceso.
7. **Borrado lógico:**
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
