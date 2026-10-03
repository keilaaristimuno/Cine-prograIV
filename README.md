<div align="center">

# 🎬 Pantalla Mágica

### Plataforma web para la administración y operación integral de un cine

Aplicación desarrollada con Angular y Supabase que centraliza la gestión de películas, funciones, salas, ventas, entradas, clientes y empleados.

[Ver aplicación desplegada](https://pantallamagica-25cb8.web.app) · [Repositorio en GitHub](https://github.com/keilaaristimuno/Cine-prograIV.git)

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Hosting-FFCA28?logo=firebase&logoColor=black)
![Estado](https://img.shields.io/badge/Estado-Módulo%203%20Completado-8B5CF6)

</div>

---

## Descripción

**Pantalla Mágica** es una aplicación web orientada a la administración y operación de un cine, desarrollada en el marco de la materia **Programación IV** (Tecnicatura Universitaria en Programación - UTN).

El sistema contempla diferentes experiencias según el tipo de usuario:

* **Visitantes / Anónimos:** Consultan la cartelera pública, buscan por título, filtran por género, revisan próximos estrenos, acceden a las fichas técnicas y consultan las funciones y horarios disponibles por película.
* **Clientes:** Usuarios registrados con perfil propio que acceden a la cartelera, detalles y horarios con sesión activa. Próximamente podrán adquirir entradas, seleccionar butacas y gestionar sus operaciones.
* **Empleados:** Operadores del cine que validarán entradas y entregas de Candy mediante códigos QR *(módulo futuro)*.
* **Administradores:** Gestión integral de películas, administración de salas (2D, 3D, 4D, 5D), programación automática de funciones con control de solapamiento y tiempos de limpieza, y a futuro promociones y reportes del cine.

El proyecto se desarrolla de forma modular y progresiva. Al finalizar el **Módulo 3**, se encuentran plenamente operativas la autenticación, la gestión de perfiles con roles, la seguridad de rutas, el panel administrativo de películas, salas y funciones (con asignación automática de sala), la cartelera pública con filtros reactivos y la visualización pública de funciones disponibles por película.

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

#### Módulo 3: Salas, Formatos y Programación de Funciones
* [x] **Modelo y formatos de proyección:**
  * Formatos soportados estrictamente tipados: `'2D' | '3D' | '4D' | '5D'`.
  * Estructura de sala simplificada y extensible (`id`, `numero`, `nombre`, `formato`, `estaActiva`).
  * Capacidad física definitiva de 518 butacas (19 filas: 15 normales, 1 accesible 'JK' y 3 VIP).
* [x] **Panel administrativo de salas (`/admin/salas`):**
  * Listado completo de salas ordenadas por número ascendente (`ServicioSalas.obtenerSalas`).
  * Formulario reactivo (`/admin/salas/nueva` y `/admin/salas/editar/:id`) con validación de número positivo único y nombre.
  * Habilitación e inhabilitación operativa de salas (`cambiarEstadoSala`) con actualización reactiva instantánea.
* [x] **Persistencia y RLS para salas:**
  * Tabla `public.salas` con restricciones de integridad (`numero > 0`, `numero UNIQUE`, `formato IN ('2D','3D','4D','5D')`).
  * Función `public.es_administrador()` y política RLS `salas_admin_all` para gestión administrativa.
  * Política RLS pública `salas_public_select` (`esta_activa = true`) para permitir el JOIN en consultas públicas de funciones.
* [x] **Validación horaria y margen obligatorio de limpieza:**
  * Cálculo estricto de finalización: `fechaHoraFin = fechaHoraInicio + duracionMinutos` (fuente única de verdad).
  * Regla de ocupación operativa de sala: intervalo semiabierto `[inicio, fechaHoraFin + 30 min)`.
  * Período de 30 minutos obligatorio de limpieza y desinfección entre funciones que no altera la `fechaHoraFin` almacenada.
  * Detección simétrica de solapamientos (`existeConflictoHorario`: `inicioB < limiteA AND inicioA < limiteB`).
  * Liberación inmediata de sala al cancelar funciones (las funciones canceladas no bloquean horarios).
* [x] **Asignación automática de salas:**
  * Programación de funciones sin selección manual de sala (`/admin/funciones/nueva`).
  * Algoritmo de asignación inteligente (`ServicioFunciones.programarFuncion`):
    1. Obtiene la duración real y estado de la película seleccionada desde `ServicioPeliculas`.
    2. Filtra salas activas compatibles con el formato solicitado (`2D`, `3D`, `4D`, `5D`).
    3. Ordena las salas candidatas por número ascendente (`numero ASC`).
    4. Evalúa disponibilidad horaria considerando la duración de la película y los 30 minutos de limpieza.
    5. Asigna automáticamente la primera sala disponible.
  * Manejo amigable de excepciones: si no hay salas disponibles, informa claramente la causa y evita la persistencia.
* [x] **Panel administrativo de funciones (`/admin/funciones`):**
  * Listado cronológico de funciones con datos asociados de película (título, duración, póster) y sala (número, nombre, formato).
  * Badges visuales de formato (`2D`, `3D`, `4D`, `5D`) y estado (`Programada` / `Cancelada`).
  * Cancelación de funciones con modal de confirmación en UI (actualiza estado a `'cancelada'` sin eliminación física, liberando el slot).
* [x] **Visualización pública de funciones disponibles:**
  * Sección "Funciones disponibles" integrada en el detalle de película (`/pelicula/:id`).
  * Consulta pública específica (`obtenerFuncionesDisponiblesPorPelicula`) filtrando en Supabase por película, `estado = 'programada'` y funciones futuras (`fecha_hora_inicio >= now()`).
  * Agrupación visual por día (`Hoy`, `Mañana`, día de la semana) con horarios en 24hs (`HH:MM`) sin desfasajes de zona horaria, badges de formato y sala asignada.
  * Cobertura de estados: carga, error con reintento, estado vacío amigable (*"No hay funciones disponibles para esta película por el momento"*) y listado de horarios.

### Próximos pasos y funcionalidades en desarrollo

* [ ] **Módulo de Butacas:** Distribución física de asientos (19 filas: 15 normales, 1 accesible 'JK' y 3 VIP = 518 butacas por sala), mapa interactivo y selección de ubicaciones.
* [ ] **Módulo de Compra y Reservas:** Definición del modelo de precios según formato (2D, 3D, 4D, 5D), reserva temporal de butacas y pasarela de pago.
* [ ] **Páginas específicas de cliente:** Panel de mi cuenta, historial de compras y consulta de crédito.
* [ ] **Páginas específicas de empleado:** Escáner e interfaz de validación de entradas por código QR.
* [ ] **Generación de entradas:** Emisión de entradas con código QR único para ingreso a sala y retiro en Candy.
* [ ] **Fidelización y promociones:** Sistema de puntos, cupones y crédito por cancelaciones.
* [ ] **Reportes y métricas:** Estadísticas de venta y ocupación, incluyendo el cálculo real de Top 3 de películas más vistas/vendidas basado en transacciones.

---

## Roles y permisos

| Rol | Estado en la aplicación | Permisos y accesos |
| :--- | :--- | :--- |
| `administrador` | **Activo e implementado** | Acceso irrestricto al panel `/admin`. Crea, edita, publica, oculta y elimina películas; administra salas (2D, 3D, 4D, 5D); programa funciones con asignación automática de sala y cancela funciones liberando slots. Próximamente gestionará promociones y reportes. |
| `empleado` | **Modelo definido en BD** *(vista operativa en desarrollo)* | Diseñado para la validación de accesos a sala y retiro de Candy mediante escaneo de QR. |
| `cliente` | **Activo e implementado** | Rol por defecto al registrarse. Dispone de sesión activa, Navbar personalizado, acceso a la cartelera, detalles de películas y consulta de funciones y horarios disponibles. La compra de entradas, selección de butacas y crédito se implementarán en módulos posteriores. |
| **Anónimo** | **Activo e implementado** | Visitante sin autenticar. Puede explorar la cartelera pública, buscar películas, filtrar por géneros, consultar próximos estrenos, ver fichas de detalle y consultar funciones y horarios disponibles por película. |

---

## Tecnologías utilizadas

### Frontend
* **Angular 22:** Componentes Standalone, nuevo sistema de flujo de control (`@if`, `@for`), Signals y Computed Signals.
* **TypeScript 5:** Tipado estricto e interfaces de dominio.
* **Angular Router:** Carga *lazy loading*, rutas dinámicas con parámetros (`:id`) y guards funcionales (`CanActivateFn`).
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
    │   │   ├── funcion.ts             # Entidad Función, DTOs de programación y detalle
    │   │   ├── pelicula.ts            # Interfaces y tipos del catálogo de películas
    │   │   ├── sala.ts                # Modelo Sala, formatos (2D, 3D, 4D, 5D) y DTOs
    │   │   └── usuario.ts             # Roles, tipos y modelo de perfil de usuario
    │   └── servicios/
    │       ├── servicio-auth.ts       # Gestión de sesión, signals y autenticación
    │       ├── servicio-funciones.ts  # Lógica horaria, margen de limpieza y asignación automática
    │       ├── servicio-peliculas.ts  # CRUD de películas, consultas públicas y Storage
    │       ├── servicio-salas.ts      # CRUD de salas y gestión de estado activa/inactiva
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
    │   │       └── detalle-pelicula/  # Ficha técnica pública y funciones disponibles agrupadas por día
    │   │
    │   └── admin/
    │       ├── layouts/
    │       │   └── admin-layout/      # Layout del panel con usuario y navegación
    │       │
    │       └── pages/
    │           ├── dashboard-admin/   # Vista de resumen administrativo
    │           ├── peliculas/
    │           │   ├── listado-peliculas/    # Grilla de administración de películas
    │           │   └── formulario-pelicula/  # Alta y edición con upload de póster
    │           ├── salas/
    │           │   ├── listado-salas/        # Gestión de salas y habilitación/inhabilitación
    │           │   └── formulario-sala/      # Alta y edición de salas
    │           └── funciones/
    │               ├── listado-funciones/    # Grilla de funciones y cancelación con modal
    │               └── formulario-funcion/   # Programación con asignación automática de sala
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

### `public.salas`
Salas del cine donde se proyectan las funciones:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador único de la sala (`gen_random_uuid()`). |
| `numero` | `integer` (UNIQUE) | Número identificatorio de la sala (`numero > 0`). |
| `nombre` | `text` | Nombre de la sala (ej. *"Sala Principal"*, *"Sala Atmos"*). |
| `formato` | `text` | Formato de proyección (`'2D'`, `'3D'`, `'4D'`, `'5D'`). |
| `esta_activa` | `boolean` | Estado operativo de la sala (habilitada/inhabilitada). |
| `creado_en` | `timestamptz` | Fecha de creación del registro. |

### `public.funciones`
Funciones programadas asociadas a películas y salas:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador único de la función (`gen_random_uuid()`). |
| `pelicula_id` | `UUID` (FK) | Referencia a `public.peliculas(id)` (`ON DELETE RESTRICT`). |
| `sala_id` | `UUID` (FK) | Referencia a `public.salas(id)` (`ON DELETE RESTRICT`). |
| `fecha_hora_inicio` | `timestamptz` | Fecha y hora exacta de inicio de la función. |
| `fecha_hora_fin` | `timestamptz` | Fecha y hora de finalización (calculada como inicio + duración). |
| `formato` | `text` | Formato de la función (`'2D'`, `'3D'`, `'4D'`, `'5D'`). |
| `estado` | `text` | Estado de la función (`'programada'`, `'cancelada'`). |
| `creado_en` | `timestamptz` | Fecha de registro de la función. |

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
8. **Algoritmo de asignación automática de salas:**
   Para prevenir errores de solapamiento y agilizar la programación, el administrador no elige una sala de forma manual. El sistema consulta las salas activas compatibles con el formato de proyección (`2D`, `3D`, `4D`, `5D`), las ordena por `numero ASC` y selecciona automáticamente la primera sala con disponibilidad horaria completa.
9. **Intervalos semiabiertos y margen obligatorio de 30 minutos de limpieza:**
   La ocupación operativa de la sala se modela como el intervalo semiabierto `[fecha_hora_inicio, fechaHoraFin + 30 min)`. La fórmula matemática de solapamiento simétrico (`inicioB < limiteA AND inicioA < limiteB`) garantiza que no existan conflictos independientemente del orden temporal en que se creen las funciones. Además, la cancelación de funciones desocupa el slot de la sala de forma instantánea.
10. **Tratamiento de huso horario local vs. TIMESTAMPTZ:**
    Para evitar desfases entre lo ingresado por el administrador y lo visualizado en la cartelera, el selector `<input type="datetime-local">` se descompone en sus partes numéricas locales y se almacena en Supabase en formato UTC ISO 8601 (`TIMESTAMPTZ`). En las vistas públicas y administrativas, se formatea utilizando la hora local del navegador (`toLocaleTimeString`, `toLocaleDateString`) en formato de 24 horas, asegurando coherencia visual exacta.
11. **Políticas de Row Level Security (RLS) granulares para funciones y salas:**
    Para proteger la base de datos sin impedir el funcionamiento de la cartelera pública, se definieron políticas `FOR SELECT` para roles `anon` y `authenticated` que filtran en la base de datos funciones exclusivamente en estado `'programada'` y salas con `esta_activa = true`. De este modo, los usuarios no autenticados pueden ver la grilla de horarios sin comprometer funciones canceladas ni salas fuera de servicio.

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
