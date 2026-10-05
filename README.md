<div align="center">

# 🎬 Pantalla Mágica

### Plataforma web para la administración y operación integral de un cine

Aplicación desarrollada con Angular y Supabase que centraliza la gestión de películas, funciones, salas, ventas, entradas, clientes y empleados.

[Ver aplicación desplegada](https://pantallamagica-25cb8.web.app) · [Repositorio en GitHub](https://github.com/keilaaristimuno/Cine-prograIV.git)

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Hosting-FFCA28?logo=firebase&logoColor=black)
![Estado](https://img.shields.io/badge/Estado-Módulo%205%20Completado%20(M5.1--M5.4)-8B5CF6)

</div>

---

## Descripción

**Pantalla Mágica** es una aplicación web orientada a la administración y operación de un cine, desarrollada en el marco de la materia **Programación IV** (Tecnicatura Universitaria en Programación - UTN).

El sistema contempla diferentes experiencias según el tipo de usuario:

* **Visitantes / Anónimos:** Consultan la cartelera pública, buscan por título, filtran por género, revisan próximos estrenos, acceden a las fichas técnicas, consultan las funciones disponibles y pueden seleccionar butacas y comprar entradas proporcionando su correo electrónico.
* **Clientes:** Usuarios registrados con perfil propio que acceden a la cartelera, seleccionan butacas en un mapa interactivo de 518 asientos, adquieren entradas mediante transacción atómica, validan restricciones de edad y disfrutan automáticamente del beneficio de primera compra (20% OFF de bienvenida).
* **Empleados:** Operadores del cine que validan el ingreso a sala mediante escaneo óptico de código QR con cámara o tipeo manual del código alfanumérico único de compra (con entrega de Candy prevista para un módulo posterior).
* **Administradores:** Gestión integral de películas (con parámetros de preventa), administración de salas (2D, 3D, 4D, 5D), programación automática de funciones con control de solapamiento y tiempos de limpieza, y gestión centralizada de tarifas por formato, recargo VIP y configuración general de promociones.

El proyecto se desarrolla de forma modular y progresiva. Al finalizar el **Módulo 5 (M5.1 a M5.4)**, se encuentran plenamente operativas la autenticación, la gestión de perfiles con roles, el panel administrativo (películas, salas, funciones y tarifas), la cartelera pública interactiva, el mapa físico de butacas con sincronización en tiempo real vía Supabase Realtime, el sistema transaccional atómico de compra de entradas (para clientes registrados y anónimos), la verificación estricta de edad (+13/+18), el motor de precios por formato con recargo VIP, preventa y descuento de primera compra no acumulables, el flujo de pago simulado con tarjeta (algoritmo de Luhn), la emisión de entradas digitales con código alfanumérico único (`TK-XXXX-XXXX`), renderizado de QR local y descarga en PDF, y el portal operativo de empleados para la validación atómica y de uso único del acceso al cine.

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

#### Módulo 4: Butacas, Disponibilidad Realtime, Precios y Compra Atómica
* [x] **M4.1 — Modelo físico de butacas de la sala:**
  * Capacidad física exacta de 518 butacas por sala, distribuidas en 19 filas según el plano oficial del cine:
    * Filas `A` a `I` (9 filas): Normales (28 butacas: bloque izquierdo 4, pasillo, central 20, pasillo, derecho 4 = 252 butacas).
    * Fila `JK` (1 fila combinada accesible): 14 butacas (bloque izquierdo 2, pasillo, central 10, pasillo, derecho 2 = 14 butacas).
    * Filas `L` a `Q` (6 filas): Normales (28 butacas: bloque izquierdo 4, pasillo, central 20, pasillo, derecho 4 = 168 butacas).
    * Filas `R`, `S` y `T` (3 filas): VIP (28 butacas: bloque izquierdo 4, pasillo, central 20, pasillo, derecho 4 = 84 butacas).
  * Desacoplamiento arquitectónico: la tabla `public.butacas` representa únicamente la estructura física de la sala y no almacena un estado booleano global de ocupación.
* [x] **M4.2 — Componente visual reutilizable (`MapaButacas`):**
  * Componente standalone (`app-mapa-butacas`) con directiva de atributos `TipoButacaDirective` para estilización visual de cada butaca (`normal`, `accesible`, `vip`).
  * Reutilizado tanto en el panel administrativo (`/admin/salas/:id/butacas`) en modo sólo lectura como en la experiencia de cliente en modo interactivo.
  * Leyenda explicativa de tipos de asiento y estados de selección (disponible, seleccionada, ocupada).
* [x] **M4.3 — Disponibilidad por función y Supabase Realtime:**
  * Ruta pública `/funcion/:id/butacas` para selección de ubicaciones por función cinematográfica.
  * Estrategia de selección 100% local en cliente (Signals), sin reservas temporales, TTL ni bloqueos efímeros.
  * Sincronización en tiempo real vía **Supabase Realtime** escuchando eventos de inserción sobre la tabla `entradas`.
  * Detección reactiva de colisiones: si otro usuario confirma una butaca seleccionada localmente, el sistema la deselecciona automáticamente y notifica con un aviso flotante.
* [x] **M4.4 — Compra atómica de entradas:**
  * Transacción ACID mediante la función RPC `public.realizar_compra_entradas` ejecutada con `SECURITY DEFINER`.
  * Creación atómica de 1 registro en `public.compras` (`estado = 'completada'`) y N registros en `public.entradas` (`estado = 'comprada'`).
  * Soporte para usuarios autenticados (asocia `usuario_id` y su email) y usuarios anónimos (requiere y valida formato de correo electrónico).
  * Restricción única en PostgreSQL (`uq_entradas_funcion_butaca_activa`) que garantiza la imposibilidad de doble venta a nivel de motor de datos.
  * Pantalla de confirmación y comprobante (`/compra/:id/confirmacion`).
* [x] **M4.5 — Restricciones de edad (+13 y +18):**
  * Cálculo estricto de edad en años considerando año, mes y día (sin desfases de huso horario).
  * Doble anillo de seguridad:
    1. **Frontend:** Bloqueo reactivo en interfaz (`SeleccionButacas`), inhabilitando selección y botón de compra con advertencia clara.
    2. **Backend (RPC):** Validación mandatoria en PostgreSQL que aborta la transacción (`RAISE EXCEPTION`) si el usuario registrado no cumple la edad requerida.
  * Validación para películas ATP (sin restricción), +13 (bloqueo para registrados menores de 13) y +18 (bloqueo para registrados menores de 18).
  * Advertencias legales de acompañamiento responsable para menores y compras anónimas.
* [x] **M4.6 — Sistema de precios, VIP, preventa y descuento de primera compra:**
  * Tabla `public.tarifas_formato` con precios base configurables (2D: $10.000, 3D: $12.000, 4D: $15.000, 5D: $18.000).
  * Tabla `public.configuracion_cine` con recargo VIP (50% por defecto) y promoción de primera compra (20% por defecto).
  * Precio unitario de lista congelado en cada entrada (`entradas.precio_unitario`).
  * Preventa configurable por película (`permite_preventa`, `porcentaje_descuento_preventa`, `dias_anticipacion_preventa`) con CHECK constraints en base de datos.
  * Descuento de primera compra (20%) para usuarios registrados con 0 compras previas completadas.
  * Regla estricta de no acumulación: si coinciden preventa y primera compra, aplica únicamente la de mayor porcentaje.
  * Control de concurrencia en primera compra mediante `SELECT ... FOR UPDATE` sobre `public.perfiles` y restricción de unicidad parcial `uq_compras_primera_compra_usuario` sobre `(es_primera_compra = true AND estado = 'completada')`.
  * Panel administrativo de tarifas (`/admin/tarifas`) protegido por RLS mediante la función `public.es_administrador()`.
  * Desglose financiero completo en modal de compra y en comprobante final (subtotal, descuento aplicado y total).
  * Compatibilidad histórica total con compras previas (`NULL`).

#### Módulo 5: Entrada Digital, Pago Simulado, QR y Validación de Acceso (M5.1 - M5.4)
* [x] **M5.1 — Identificador alfanumérico único por compra (`TK-XXXX-XXXX`):**
  * Generación criptográfica en PostgreSQL mediante `gen_random_bytes` con formato estandarizado `TK-[A-Z0-9]{4}-[A-Z0-9]{4}` (sin caracteres ambiguos como `I`, `O`, `0`, `1`).
  * Política de acceso grupal: **1 compra = 1 código alfanumérico = 1 QR de cine**, independientemente de la cantidad de butacas adquiridas.
  * Backfill histórico retrocompatible con captura de `unique_violation` ante colisiones y restricción `UNIQUE` en base de datos.
  * Generación y asignación atómica dentro de la RPC `realizar_compra_entradas`.
* [x] **M5.2 — Flujo de pago simulado con tarjeta de crédito/débito (`/compra/pago`):**
  * Pantalla de pago simulado insertada entre la selección de butacas y la persistencia de la compra.
  * Borrador de compra en memoria del cliente (sin reservas huérfanas ni locks efímeros en base de datos).
  * Formulario reactivo con validación mediante el **algoritmo de Luhn (módulo 10)** para detección de números de tarjeta inválidos, fecha de vencimiento no expirada, CVV y titular.
  * Simulación académica con retroalimentación visual inmediata sin almacenar ni transmitir datos sensibles de tarjeta a Supabase, `localStorage`, `sessionStorage` ni logs.
  * Confirmación transaccional: tras la aprobación del pago simulado se invoca la RPC `realizar_compra_entradas`, adoptando los importes definitivos calculados por PostgreSQL.
* [x] **M5.3 — Entrada digital, código QR y exportación a PDF:**
  * Comprobante rediseñado con estética de ticket cinematográfico (`/compra/:id/confirmacion`).
  * Generación de código QR en cliente con la librería `qrcode`, codificando exclusivamente el código de acceso `TK-XXXX-XXXX`.
  * Soporte completo para compras individuales y compras grupales (resumen de todas las butacas adquiridas para la función).
  * Descarga directa de la entrada en formato **PDF vectorial** utilizando `jspdf` para presentación o impresión física.
* [x] **M5.4 — Portal de empleado, escaneo QR y validación atómica de acceso (`/empleado/validar-entrada`):**
  * Portal operativo protegido mediante `empleadoGuard`, restringido a usuarios con rol `empleado` o `administrador`.
  * Validación dual y convergente:
    1. **Escaneo óptico de código QR:** Integración con `html5-qrcode` mediante cámara web o dispositivo móvil, con detección automática, detención inmediata de cámara tras lectura y liberación de hardware al desmontar el componente.
    2. **Ingreso manual:** Formulario reactivo para tipeo del código `TK-XXXX-XXXX` con formateo y normalización automática.
  * Validación transaccional atómica en PostgreSQL mediante la función RPC `public.validar_acceso_sala(p_codigo text)` con `SECURITY DEFINER` y `SET search_path = public, pg_temp`:
    * Autorización en base de datos comprobando que el ejecutor posea rol de empleado o administrador vía `auth.uid()`.
    * Control de concurrencia mediante `SELECT ... FOR UPDATE` sobre `public.compras` para garantizar el **uso único e irrepetible** del pase grupal.
    * Verificación estricta de función única (`COUNT(DISTINCT e.funcion_id) = 1`) para resguardar la coherencia de las entradas asociadas.
    * Auditoría completa de validación: registro de marca temporal (`acceso_sala_validado_en`) y del operador validador (`acceso_sala_validado_por`), obteniendo su correo directamente desde `auth.users.email`.
    * Respuestas tipadas con estados visuales claros: `ACCESO AUTORIZADO`, `ENTRADA YA UTILIZADA`, `ENTRADA NO VÁLIDA` y `FUNCIÓN CANCELADA`.

### Próximos pasos y funcionalidades en desarrollo

* [ ] **Páginas específicas de cliente:** Panel de mi cuenta, historial de compras y consulta de crédito.
* [x] **Páginas específicas de empleado:** Escáner e interfaz de validación de entradas por código QR e ingreso manual.
* [x] **Generación de entradas:** Emisión de entradas con código QR y código alfanumérico único para ingreso a sala (PDF descargable y pase digital grupal).
* [ ] **Módulo Candy:** Catálogo de productos, combos y retiro en mostrador (código y validación independiente).
* [ ] **Fidelización y cancelaciones:** Sistema de puntos, cupones y crédito por cancelaciones.
* [ ] **Reportes y métricas:** Estadísticas de venta y ocupación, incluyendo el cálculo real de Top 3 de películas más vistas/vendidas basado en transacciones.

---

## Roles y permisos

| Rol | Estado en la aplicación | Permisos y accesos |
| :--- | :--- | :--- |
| `administrador` | **Activo e implementado** | Acceso irrestricto al panel `/admin`. Crea, edita, publica, oculta y elimina películas (con parámetros de preventa); administra salas (2D, 3D, 4D, 5D); programa funciones con asignación automática de sala; cancela funciones liberando slots; y gestiona centralizadamente tarifas por formato, recargo VIP y promoción de primera compra (`/admin/tarifas`). También cuenta con acceso operativo al validador de entradas de empleados (`/empleado/validar-entrada`). |
| `empleado` | **Activo e implementado** | Acceso al sector operativo `/empleado` protegido por `empleadoGuard`. Operador del cine facultado para validar el acceso grupal a la sala mediante escaneo de código QR o tipeo manual de código alfanumérico (`/empleado/validar-entrada`). |
| `cliente` | **Activo e implementado** | Rol por defecto al registrarse. Dispone de sesión activa, Navbar personalizado, cartelera, ficha de detalles, selección interactiva de butacas en mapa físico, compra atómica de entradas con verificación de edad y acceso automático al beneficio de primera compra (20% OFF de bienvenida). |
| **Anónimo** | **Activo e implementado** | Visitante sin autenticar. Explora la cartelera, busca películas, filtra por géneros, consulta próximos estrenos, fichas de detalle, funciones disponibles y puede seleccionar butacas y comprar entradas válidas indicando un correo electrónico de contacto. |

---

## Tecnologías utilizadas

### Frontend
* **Angular 22:** Componentes Standalone, nuevo sistema de flujo de control (`@if`, `@for`), Signals y Computed Signals.
* **TypeScript 5:** Tipado estricto e interfaces de dominio.
* **Angular Router:** Carga *lazy loading*, rutas dinámicas con parámetros (`:id`) y guards funcionales (`CanActivateFn`).
* **Angular Reactive Forms:** Formularios con validadores sincronizados y tipados (incluyendo algoritmo de Luhn en cliente).
* **SCSS:** Estilos modulares con paleta cinematográfica personalizada.
* **html5-qrcode:** Escaneo óptico de códigos QR en tiempo real mediante cámara web o sensor de dispositivo móvil.
* **qrcode:** Generación y renderizado dinámico de códigos QR en Canvas del cliente.
* **jspdf:** Generación y exportación de comprobantes y entradas digitales en formato PDF vectorial descargable.

### Backend y Base de Datos (BaaS)
* **Supabase:**
  * **Authentication:** Gestión de usuarios y credenciales cifradas (`auth.users`).
  * **PostgreSQL:** Base de datos relacional con trigger PL/pgSQL, funciones `SECURITY DEFINER` y control de concurrencia (`FOR UPDATE`).
  * **Realtime:** Suscripciones a eventos de base de datos (`postgres_changes`) para sincronización instantánea de butacas vendidas entre clientes conectados.
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
    │   │   ├── admin.guard.ts         # Protección funcional de rutas administrativas
    │   │   └── empleado.guard.ts      # Protección funcional de rutas operativas de empleados/admin
    │   ├── modelos/
    │   │   ├── butaca.ts              # Modelo físico de butaca y tipos ('normal', 'accesible', 'vip')
    │   │   ├── compra.ts              # Modelo Compra, estados, DTOs y desglose financiero
    │   │   ├── entrada.ts             # Modelo Entrada, estados ('comprada', 'cancelada') y precio unitario
    │   │   ├── funcion.ts             # Entidad Función, DTOs de programación y detalle
    │   │   ├── pelicula.ts            # Interfaces, tipos del catálogo y campos de preventa
    │   │   ├── sala.ts                # Modelo Sala, formatos (2D, 3D, 4D, 5D) y DTOs
    │   │   ├── tarifa.ts              # Tarifas por formato, recargo VIP y configuración de promociones
    │   │   ├── usuario.ts             # Roles, tipos y modelo de perfil de usuario
    │   │   └── validacion-acceso.ts   # Tipos y respuestas tipadas para validación de acceso a sala
    │   └── servicios/
    │       ├── servicio-auth.ts       # Gestión de sesión, signals y autenticación
    │       ├── servicio-butacas.ts    # Butacas físicas de sala y ocupadas por función (Realtime)
    │       ├── servicio-compras.ts    # Orquestación de compra atómica, historial y validación de acceso RPC
    │       ├── servicio-funciones.ts  # Lógica horaria, margen de limpieza y asignación automática
    │       ├── servicio-pdf-entrada.ts# Generación y exportación de entradas digitales en PDF vectorial
    │       ├── servicio-peliculas.ts  # CRUD de películas, consultas públicas y Storage
    │       ├── servicio-salas.ts      # CRUD de salas y gestión de estado activa/inactiva
    │       ├── servicio-supabase.ts   # Conexión cliente con Supabase
    │       └── servicio-tarifas.ts    # Lectura y actualización de tarifas y configuración de cine
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
    │   │       ├── pago-simulado/     # Formulario de pago simulado (Luhn), borrador en memoria y feedback
    │   │       ├── confirmacion-compra/# Comprobante con ticket visual, QR de acceso grupal y descarga en PDF
    │   │       ├── detalle-pelicula/  # Ficha técnica pública y funciones disponibles agrupadas por día
    │   │       └── seleccion-butacas/ # Selección interactiva, control de edad y navegación hacia pago
    │   │
    │   ├── admin/
    │   │   ├── layouts/
    │   │   │   └── admin-layout/      # Layout del panel con usuario y navegación
    │   │   │
    │   │   └── pages/
    │   │       ├── dashboard-admin/   # Vista de resumen administrativo
    │   │       ├── peliculas/
    │   │       │   ├── listado-peliculas/    # Grilla de administración de películas
    │   │       │   └── formulario-pelicula/  # Alta y edición con upload de póster y preventa
    │   │       ├── salas/
    │   │       │   ├── listado-salas/        # Gestión de salas y habilitación/inhabilitación
    │   │       │   ├── formulario-sala/      # Alta y edición de salas
    │   │       │   └── mapa-sala/            # Vista administrativa del plano de 518 butacas
    │   │       ├── funciones/
    │   │       │   ├── listado-funciones/    # Grilla de funciones y cancelación con modal
    │   │       │   └── formulario-funcion/   # Programación con asignación automática de sala
    │   │       └── tarifas/
    │   │           └── gestion-tarifas/      # Panel de tarifas por formato, recargo VIP y promociones
    │   │
    │   └── empleado/
    │       ├── layouts/
    │       │   └── empleado-layout/   # Layout operativo de empleado con control de sesión
    │       └── paginas/
    │           └── validar-entrada/   # Validación dual de acceso grupal (lector de cámara QR + código manual)
    │
    ├── shared/
    │   ├── components/
    │   │   └── mapa-butacas/          # Componente standalone interactivo del plano físico de 518 butacas
    │   └── directivas/
    │       └── tipo-butaca.directive.ts # Directiva de atributos para estilización visual de butacas
    │
    ├── app.config.ts                  # Configuración global e inyección de dependencias
    └── app.routes.ts                  # Enrutamiento con lazy loading y guards (adminGuard, empleadoGuard)
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
| `permite_preventa` | `boolean` | Habilita venta anticipada con descuento promocional (`DEFAULT false`). |
| `porcentaje_descuento_preventa` | `numeric(5,2)` | Porcentaje de descuento por preventa (`DEFAULT 20.00`). |
| `dias_anticipacion_preventa` | `integer` | Días mínimos requeridos entre la compra y la función (`DEFAULT 7`). |
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

### `public.butacas`
Ubicaciones físicas permanentes de cada sala (capacidad física de 518 asientos por sala):

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador único de la butaca (`gen_random_uuid()`). |
| `sala_id` | `UUID` (FK) | Sala a la que pertenece (`ON DELETE CASCADE`). |
| `fila` | `text` | Fila física de la butaca (`'A'` a `'T'`). |
| `numero` | `integer` | Número identificatorio de la butaca dentro de la fila (1 a 28). |
| `tipo` | `text` | Tipo de butaca: `'normal'`, `'accesible'` (fila JK) o `'vip'` (filas R, S, T). |
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

### `public.compras`
Cabecera transaccional de compras realizadas por clientes registrados o anónimos:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador único de la compra (`gen_random_uuid()`). |
| `usuario_id` | `UUID` (FK) | Referencia a `auth.users(id)` (`ON DELETE SET NULL`, `NULL` en compras de anónimos). |
| `email_contacto` | `text` | Correo electrónico del comprador (obtenido de Auth o ingresado en compra anónima). |
| `subtotal` | `numeric(10,2)` | Monto acumulado de precios de lista antes de descuentos (`NULL` en compras históricas pre-M4.6). |
| `porcentaje_descuento_aplicado` | `numeric(5,2)` | Porcentaje de descuento aplicado (`DEFAULT 0.00`). |
| `monto_descuento` | `numeric(10,2)` | Monto total descontado sobre el subtotal (`DEFAULT 0.00`). |
| `tipo_descuento_aplicado` | `text` | Promoción ganadora aplicada: `'ninguno'`, `'preventa'`, `'primera_compra'`. |
| `es_primera_compra` | `boolean` | Indica que la transacción corresponde a la primera compra completada del usuario registrado (`DEFAULT false`). |
| `total` | `numeric(10,2)` | Monto total final cobrado (`NULL` en compras históricas pre-M4.6). |
| `codigo_alfanumerico` | `text` (UNIQUE) | Código único de acceso al cine con formato `TK-XXXX-XXXX` generado criptográficamente (`gen_random_bytes`). |
| `acceso_sala_validado` | `boolean` | Indica si el pase grupal ya fue utilizado para ingresar a la sala (`DEFAULT false`). |
| `acceso_sala_validado_en` | `timestamptz` | Fecha y hora de la validación del acceso al cine (`NULL` si aún no fue utilizado). |
| `acceso_sala_validado_por` | `UUID` (FK) | Referencia al usuario empleado/administrador (`auth.users.id`) que validó el acceso. |
| `estado` | `text` | Estado de la compra: `'pendiente'`, `'completada'`, `'cancelada'`. |
| `creado_en` | `timestamptz` | Fecha y hora de la transacción. |

*Restricciones de integridad y unicidad:*
- `uq_compras_codigo_alfanumerico` sobre `(codigo_alfanumerico)`.
- `uq_compras_primera_compra_usuario` sobre `(usuario_id) WHERE (es_primera_compra = true AND estado = 'completada')`.

### `public.entradas`
Detalle de entradas individuales asociadas a una compra, función y butaca física:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `UUID` (PK) | Identificador único de la entrada (`gen_random_uuid()`). |
| `compra_id` | `UUID` (FK) | Referencia a la transacción `public.compras(id)` (`ON DELETE CASCADE`). |
| `funcion_id` | `UUID` (FK) | Referencia a `public.funciones(id)` (`ON DELETE CASCADE`). |
| `butaca_id` | `UUID` (FK) | Referencia a `public.butacas(id)` (`ON DELETE RESTRICT`). |
| `precio_unitario` | `numeric(10,2)` | Precio de lista congelado al momento de la venta (`NULL` en compras históricas pre-M4.6). |
| `estado` | `text` | Estado de la entrada: `'comprada'`, `'cancelada'`. |
| `creado_en` | `timestamptz` | Fecha de emisión de la entrada. |

*Restricción de unicidad parcial:* `uq_entradas_funcion_butaca_activa` sobre `(funcion_id, butaca_id) WHERE (estado = 'comprada')` para prevención infalible de doble venta.

### `public.tarifas_formato`
Precios de lista base por formato de proyección gestionados desde el panel administrativo:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `formato` | `text` (PK) | Formato de sala/función: `'2D'`, `'3D'`, `'4D'`, `'5D'`. |
| `precio_base` | `numeric(10,2)` | Tarifa base de lista para butacas normales y accesibles (`precio_base >= 0`). |
| `actualizado_en` | `timestamptz` | Fecha y hora de la última modificación. |

### `public.configuracion_cine`
Tabla singleton con parámetros comerciales globales y porcentajes de recargo/descuento:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `integer` (PK) | Identificador singleton del cine (`DEFAULT 1 CHECK (id = 1)`). |
| `porcentaje_recargo_vip` | `numeric(5,2)` | Recargo porcentual sobre precio base para butacas VIP (`DEFAULT 50.00`). |
| `porcentaje_descuento_primera_compra` | `numeric(5,2)` | Descuento porcentual para la primera compra del usuario (`DEFAULT 20.00`). |
| `descuento_primera_compra_activo` | `boolean` | Habilitación operativa de la promoción de primera compra (`DEFAULT true`). |
| `dias_anticipacion_preventa` | `integer` | Días de anticipación por defecto para compras en preventa (`DEFAULT 7`). |
| `actualizado_en` | `timestamptz` | Fecha y hora de la última actualización administrativa. |

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
12. **Desacoplamiento del mapa físico y disponibilidad dinámica por función:**
    La tabla `public.butacas` modela estrictamente la infraestructura estática de la sala (518 butacas divididas en 19 filas con tipos `'normal'`, `'accesible'` y `'vip'`), sin flags globales de ocupación booleana. La disponibilidad de un asiento se determina dinámicamente consultando la tabla relacional `public.entradas` para una `funcion_id` dada con `estado = 'comprada'`. Esto desacopla la capacidad del inventario temporal y permite reutilizar la misma sala física en infinitas funciones a lo largo del tiempo.
13. **Disponibilidad en tiempo real mediante Supabase Realtime (sin locks temporales):**
    En lugar de implementar complejos mecanismos de reserva efímera con TTL o bloqueo temporal de asientos (que saturan la base y generan fricción al expirar carritos), la selección de butacas se gestiona en memoria mediante Signals en el cliente. Para sincronizar la ocupación entre múltiples pestañas o usuarios concurrentes, se utiliza un canal de **Supabase Realtime** (`postgres_changes` sobre `public.entradas`). Si otro usuario adquiere una butaca que el cliente tenía seleccionada en su navegador, el sistema la marca instantáneamente como ocupada, la remueve de su selección local y muestra una notificación reactiva no bloqueante.
14. **Transacción atómica de compra mediante RPC SECURITY DEFINER:**
    Para garantizar consistencia ACID absoluta y prevenir condiciones de carrera (*race conditions*) o doble venta, la compra completa se ejecuta en una única llamada a la función PL/pgSQL `public.realizar_compra_entradas(...)`. La función opera con `SECURITY DEFINER`, valida la existencia y estado de la función, verifica que las butacas pertenezcan a la sala, comprueba que ninguna butaca esté ya vendida (`estado = 'comprada'`), evalúa restricciones de edad, calcula tarifas y promociones, e inserta atómicamente la cabecera en `public.compras` (`estado = 'completada'`) y cada renglón en `public.entradas` (`estado = 'comprada'`). Adicionalmente, el índice único parcial `uq_entradas_funcion_butaca_activa` en PostgreSQL garantiza a nivel del motor que ninguna butaca pueda venderse dos veces para la misma función.
15. **Doble anillo de validación en restricciones de edad (+13 y +18):**
    La protección de contenidos para menores se implementa con una arquitectura defensiva de doble anillo:
    - *Anillo de cliente (UX):* El componente `SeleccionButacas` consulta la fecha de nacimiento del perfil autenticado, calcula la edad exacta considerando año, mes y día (sin errores de huso horario), y deshabilita la selección de asientos y el botón de compra si no cumple con la clasificación (+13 o +18). Para compras anónimas, despliega una advertencia obligatoria de acompañamiento de adultos.
    - *Anillo de servidor (Integridad):* La RPC `realizar_compra_entradas` en PostgreSQL realiza la misma comprobación estricta de edad sobre `public.perfiles` (`fecha_nacimiento`). Si un usuario intenta eludir el cliente llamando directamente a la API o RPC, PostgreSQL lanza una excepción (`RAISE EXCEPTION`) y aborta la transacción inmediatamente.
16. **Precios base por formato, recargo VIP y congelamiento histórico:**
    El sistema desacopla los precios de las salas y funciones mediante la tabla `public.tarifas_formato` (`2D`, `3D`, `4D`, `5D`) y `public.configuracion_cine` (`porcentaje_recargo_vip`). Las butacas normales y accesibles tributan el precio base del formato de la función, mientras que las butacas VIP aplican el recargo configurable (por defecto 50%). Cada entrada vendida congela su precio de lista en `entradas.precio_unitario`, garantizando que futuras modificaciones de tarifas no alteren los montos facturados en compras históricas ni rompan la contabilidad.
17. **Descuentos no acumulables, serialización con `FOR UPDATE` y restricción de primera compra:**
    El sistema admite dos promociones: preventa por película (si la función se adquiere con la anticipación requerida) y descuento de primera compra (20% para clientes registrados sin compras previas completadas). Por regla de negocio, **los descuentos no se acumulan en cascada**: si ambas promociones coinciden, el sistema selecciona automáticamente la de mayor porcentaje. Para evitar que dos transacciones simultáneas de un mismo usuario apliquen ambas el descuento de bienvenida, la RPC bloquea la fila del usuario con `SELECT ... FROM public.perfiles WHERE usuario_id = p_usuario_id FOR UPDATE` y la base de datos refuerza la regla con el índice único parcial `uq_compras_primera_compra_usuario` sobre `public.compras (usuario_id) WHERE (es_primera_compra = true AND estado = 'completada')`.
18. **Pase grupal por compra y código alfanumérico criptográfico (`gen_random_bytes`):**
    Para agilizar la experiencia de ingreso y simplificar la logística operativa, se adoptó la decisión de emitir **un único pase digital grupal por compra (1 compra = 1 código alfanumérico = 1 código QR)**, en lugar de generar entradas o códigos individuales por butaca. El código alfanumérico con formato `TK-XXXX-XXXX` se genera en PostgreSQL mediante `gen_random_bytes` a partir de un alfabeto de 32 caracteres (alfanumérico en mayúsculas excluyendo caracteres visualmente confusos como `0`, `O`, `1`, `I`). La unicidad está garantizada por una restricción `UNIQUE` en base de datos y un bucle de inserción con reintentos controlados ante eventuales colisiones.
19. **Borrador de compra en memoria y validación de tarjeta con algoritmo de Luhn (módulo 10):**
    Para prevenir el bloqueo innecesario de asientos por carritos abandonados sin recurrir a locks temporales o registros efímeros en base de datos, los datos de la compra seleccionada se preservan únicamente en memoria reactiva del cliente (Signals). La pantalla de pago simulado (`/compra/pago`) implementa una validación exhaustiva mediante el algoritmo de checksum de Luhn (módulo 10) para alertar sobre números de tarjeta con dígitos erróneos o inválidos. Se simula una aprobación/rechazo bancario inmediato con fines pedagógicos, sin persistir ni transmitir en ningún momento datos sensibles a Supabase, `localStorage`, `sessionStorage` ni logs. Solo tras la aprobación del pago simulado se invoca la RPC transaccional definitiva `realizar_compra_entradas`.
20. **Validación atómica de acceso grupal, bloqueo pesimista con `FOR UPDATE` y auditoría en `auth.users`:**
    La admisión a la sala cinematográfica se realiza a través de la función RPC `public.validar_acceso_sala(p_codigo text)` con `SECURITY DEFINER` y `SET search_path = public, pg_temp`. Para garantizar el uso único e irrepetible del pase y prevenir ataques de reproducción o doble validación concurrente, la función ejecuta un bloqueo pesimista mediante `SELECT ... FOR UPDATE` sobre la compra. Adicionalmente, verifica explícitamente que las entradas activas pertenezcan a una única función (`COUNT(DISTINCT e.funcion_id) = 1`), asegurando consistencia física. Al autorizar el acceso, marca de manera atómica `acceso_sala_validado = true`, almacena la marca temporal y el identificador del validador, recuperando el correo del empleado o administrador directamente desde `auth.users.email` para una trazabilidad transparente y segura.

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
