<div align="center">

# 🎬 Pantalla Mágica Cinema

### Plataforma web para la administración y operación integral de un cine

Aplicación desarrollada con Angular y Supabase que centraliza la cartelera, selección interactiva de butacas en tiempo real, venta de entradas y Candy Bar, control de acceso mediante QR, reseñas de espectadores, programa de fidelización y soporte PWA instalable.

**[🌐 Ver aplicación desplegada](https://pantallamagica-25cb8.web.app)**

![Angular](https://img.shields.io/badge/Angular-22.1.6-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend%20%2F%20Postgres-3FCF8E?logo=supabase&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Hosting-FFCA28?logo=firebase&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Angular%20Service%20Worker-5A0FC8?logo=pwa&logoColor=white)
![Pruebas Unitarias](https://img.shields.io/badge/Pruebas%20Unitarias-147%20aprobadas%20(27%20suites)-success)

</div>

---

## 📋 Descripción

**Pantalla Mágica** es una plataforma web integral concebida para la digitalización de las operaciones comerciales y de control de un cine moderno, desarrollada en el marco de la materia **Programación IV** (Tecnicatura Universitaria en Programación - UTN).

El sistema contempla una arquitectura desacoplada y orientada a roles con cuatro experiencias de uso:

1. **Visitantes / Anónimos:** Consultan la cartelera en vivo, buscan por título, filtran por géneros con lógica multigénero, revisan el Top 3 de películas mejor calificadas por espectadores reales, consultan próximos estrenos y funciones programadas, exploran el catálogo de Candy Bar, seleccionan butacas sobre el mapa físico de la sala con sincronización en tiempo real y pueden comprar entradas o combos de Candy proporcionando un correo electrónico de contacto.
2. **Clientes (Usuarios Registrados):** Disponen de cuenta personal ampliada, acceso a promociones exclusivas (descuento automático de bienvenida del 20% en su primera compra), acumulación automática de puntos de fidelización por cada peso gastado en entradas y Candy, canje de recompensas por cupones con código seguro (`CP-XXXX-XXXX`), un Área Cliente privada (`/mi-cuenta`) con historial de entradas, películas vistas y cupones, publicación de reseñas y calificaciones (restringidas a quienes efectivamente asistieron a la función) y la posibilidad de instalar la aplicación en su dispositivo como PWA standalone.
3. **Empleados (Operadores del Cine):** Acceden a un portal operativo optimizado para dispositivos móviles y puestos de control, facultados para validar accesos a sala escaneando el código QR de la entrada digital o ingresando manualmente el código `TK-XXXX-XXXX`, así como validar entregas de pedidos de Candy Bar mediante escaneo de QR o tipeo de código `CD-XXXX-XXXX`, garantizando un uso único e intransferible.
4. **Administradores:** Gestión centralizada de películas (con parámetros de preventa y carga de pósteres a Supabase Storage), administración de salas (2D, 3D, 4D, 5D), programación asistida de funciones con asignación automática de sala y bloqueo obligatorio de 30 minutos de limpieza, catálogo de Candy Bar con control de stock y subida de imágenes, matriz de tarifas por formato y recargo VIP, gestión comercial del programa de puntos y recompensas, y auditoría global de cupones emitidos.

---

## 🏛️ Arquitectura General del Sistema

El proyecto combina un frontend reactivo desarrollado en **Angular 22** con un backend escalable y transaccional provisto por **Supabase** (PostgreSQL 15):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ANGULAR 22 FRONTEND                             │
│  - Standalone Components & Directives   - Angular Signals & Computed   │
│  - Reactive Forms (Luhn Checksum)      - Router con Lazy Loading       │
│  - Angular Service Worker (PWA)        - html5-qrcode & jspdf          │
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │ HTTPS / REST (PostgREST)       │ WSS (WebSockets)
                    ▼                                ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────┐
│          SUPABASE BACKEND            │   │      SUPABASE REALTIME      │
│  - Supabase Auth (auth.users)        │   │  - Canal postgres_changes   │
│  - Row Level Security (RLS)          │   │  - Sincronización instantánea│
│  - Stored Procedures (PL/pgSQL RPC)  │   │    de butacas vendidas      │
│  - PostgreSQL Triggers & Constraints │   └─────────────────────────────┘
│  - Storage Buckets (posters, candy)  │
└──────────────────────────────────────┘
```

---

## ✅ Funcionalidades Implementadas

### Módulo 1: Autenticación, Perfiles y Administración de Películas
- **Autenticación con Supabase Auth:** Registro e inicio de sesión seguros mediante correo y contraseña.
- **Formulario de Registro Ampliado:** Captura y valida datos personales obligatorios (nombre, apellido, fecha de nacimiento no futura, tipo de sangre dentro del catálogo clínico permitido, color de ojos y días de vacaciones).
- **Aprovisionamiento Automático de Perfiles:** Trigger PostgreSQL (`tr_crear_perfil_nuevo_usuario`) ejecutado con `SECURITY DEFINER` tras el alta en `auth.users`, asignando automáticamente `rol = 'cliente'`, `credito = 0.00` y `saldo_puntos = 0`.
- **Protección de Rutas (Guards Funcionales):**
  - `adminGuard`: Restringe rutas `/admin/**` exclusivamente a administradores, sincronizando de forma asíncrona la sesión (`asegurarSesionLista()`).
  - `empleadoGuard`: Protege rutas `/empleado/**` para usuarios con rol `empleado` o `administrador`.
  - `authGuard`: Protege rutas privadas de cliente `/mi-cuenta/**` exigiendo sesión activa.
- **Panel Administrativo de Películas (`/admin/peliculas`):** Listado con vista previa, formulario reactivo de alta y edición, subida directa de pósteres a Supabase Storage (bucket `posters`), publicación/ocultamiento y borrado lógico para preservar la integridad histórica de ventas.

### Módulo 2: Cartelera Pública, Filtros y Detalle de Película
- **Cartelera Reactiva (`/`):** Carga optimizada de títulos activos (`esta_activa = true` y no eliminados). Manejo reactivo de estados (carga con spinner, error con reintento, estado vacío y catálogo).
- **Hero Dinámico y Películas Destacadas:** Banner superior con el estreno principal y sección de hasta 3 títulos destacados ordenados cronológicamente.
- **Buscador en Tiempo Real y Filtros Multigénero:** Búsqueda case-insensitive por título combinada mediante lógica AND con chips interactivos de género con semántica OR (ej. Acción o Ciencia Ficción).
- **Sección Próximamente:** Agrupación cronológica automática de películas cuya fecha de estreno es posterior a la fecha local del usuario.
- **Ficha Técnica Detallada (`/pelicula/:id`):** Información completa, géneros, duración, calificación por edades, aviso de preventa/estreno, funciones futuras disponibles agrupadas por día y sección de reseñas comunitarias.

### Módulo 3: Salas, Formatos y Programación Inteligente de Funciones
- **Formatos Tipados:** Soporte para proyecciones `2D`, `3D`, `4D` y `5D`.
- **Administración de Salas (`/admin/salas`):** Alta, edición, habilitación/inhabilitación operativa y visualización del plano físico.
- **Asignación Automática de Salas:** Algoritmo que filtra salas activas del formato solicitado, evalúa disponibilidad horaria y asigna automáticamente la primera sala libre (`numero ASC`).
- **Regla Horaria y Margen Obligatorio de Limpieza:** Duración de la función calculada como `inicio + duracionMinutos`. Bloqueo operativo en intervalo semiabierto `[inicio, fin + 30 min)` para desinfección obligatoria de la sala. Detección simétrica de solapamientos (`inicioB < limiteA AND inicioA < limiteB`). Liberación inmediata de slot al cancelar una función.
- **Cancelación de Funciones:** Actualización lógica a estado `'cancelada'` sin eliminación física para preservar historial contable.

### Módulo 4: Butacas, Disponibilidad Realtime, Precios y Compra Atómica
- **Modelo Físico de 518 Butacas:** Capacidad fija de 518 asientos distribuidos en 19 filas según el plano oficial del cine:
  - Filas `A` a `I` (9 filas normales de 28 butacas = 252 butacas).
  - Fila `JK` (1 fila combinada accesible de 14 butacas).
  - Filas `L` a `Q` (6 filas normales de 28 butacas = 168 butacas).
  - Filas `R`, `S` y `T` (3 filas VIP de 28 butacas = 84 butacas).
- **Componente Visual `MapaButacas`:** Plano interactivo con leyenda, estados (libre, seleccionada, ocupada) y directiva `TipoButacaDirective`.
- **Sincronización en Tiempo Real con Supabase Realtime:** Canal WebSocket escuchando inserciones en `entradas`. Detección inmediata de colisiones y deselección automática si otro cliente adquiere la butaca simultáneamente.
- **Transacción Atómica de Compra (`realizar_compra_entradas`):**
  - Creación atómica de cabecera en `public.compras` y renglones en `public.entradas`.
  - Soporte para compras de clientes registrados y compras anónimas (validando formato de correo electrónico).
  - Índice único parcial en PostgreSQL (`uq_entradas_funcion_butaca_activa`) que impide la doble venta a nivel del motor de base de datos.
- **Validación Estricta de Restricciones de Edad (+13 y +18):** Doble anillo de validación: cálculo reactivo de edad exacta en frontend con bloqueo visual y comprobación mandatoria en la RPC de PostgreSQL que aborta la transacción (`RAISE EXCEPTION`) ante menores no autorizados.
- **Motor Financiero y Tarifas:** Precios base configurables por formato (`tarifas_formato`), recargo porcentual VIP (50% por defecto) y congelamiento de precio de lista en cada entrada vendida (`precio_unitario`).
- **Descuentos de Primera Compra y Preventa:** Promoción de bienvenida (20% OFF para registrados en su primera compra) y descuento por preventa configurable por película. Regla de **no acumulación** (aplica el mayor beneficio). Control de concurrencia mediante `SELECT ... FOR UPDATE` sobre el perfil del comprador y restricción de unicidad parcial `uq_compras_primera_compra_usuario`.

### Módulo 5: Entrada Digital, Pago Simulado, QR y Validación de Acceso
- **Pase Grupal con Código Criptográfico (`TK-XXXX-XXXX`):** Generación segura mediante `gen_random_bytes` con alfabeto sin caracteres ambiguos (excluye `0`, `O`, `1`, `I`). 1 compra = 1 código alfanumérico = 1 código QR grupal, sin importar cuántas butacas integren la transacción.
- **Pago Simulado con Algoritmo de Luhn (`/compra/pago`):** Validación matemática de checksum (módulo 10) para números de tarjeta, fecha de vencimiento no expirada, titular y CVV. Borrador en memoria reactiva sin bloqueos efímeros en base de datos.
- **Entrada Digital y Descarga en PDF (`/compra/:id/confirmacion`):** Comprobante visual con diseño cinematográfico, renderizado dinámico de código QR en Canvas con la librería `qrcode` y generación de voucher descargable en PDF vectorial con `jspdf`.
- **Portal de Empleado y Validación Atómica de Acceso (`/empleado/validar-entrada`):**
  - Escaneo óptico de QR mediante cámara con `html5-qrcode` o tipeo manual del código `TK-XXXX-XXXX`.
  - RPC `public.validar_acceso_sala` con `SECURITY DEFINER` y control de concurrencia `SELECT ... FOR UPDATE` sobre la compra.
  - Validación de uso único e irrepetible: registro de marca temporal (`acceso_sala_validado_en`) y del operador validador (`acceso_sala_validado_por` con su email desde `auth.users`).

### Módulo 6: Candy Bar Integral
- **Catálogo y Administración de Productos (`/admin/candy`):** Alta, edición, categorización (combos, pochoclos, bebidas, golosinas), control numérico de stock, estado activo/pausado y carga de imágenes a Supabase Storage (bucket `candy`).
- **Tienda Pública de Candy (`/candy`):** Catálogo interactivo con filtrado por categoría, indicador de disponibilidad y carrito de compras reactivo en memoria gestionado con Signals.
- **Compra Atómica de Candy (`public.realizar_compra_candy`):**
  - Transacción ACID con `SECURITY DEFINER`.
  - Bloqueo pesimista `SELECT ... FOR UPDATE` sobre cada producto para verificar y descontar stock disponible sin condiciones de carrera.
  - Emisión de código de retiro único criptográfico `CD-XXXX-XXXX` y registro en `public.compras_candy` y `public.detalles_compra_candy`.
- **Voucher y Comprobante PDF de Candy (`/candy/confirmacion/:id`):** Generación de código QR para mostrador y descarga de ticket en PDF vectorial.
- **Portal de Validación de Entrega Candy (`/empleado/validar-candy`):** Escaneo de QR o ingreso manual de código `CD-XXXX-XXXX`, validación atómica mediante la RPC `public.validar_entrega_candy` con `FOR UPDATE`, transición de estado a `'entregada'` y registro de auditoría del empleado.

### Módulo 7: Reseñas, Calificaciones y Ranking Top 3
- **Modelo de Reseñas (`public.resenas`):** Calificación obligatoria de 1 a 5 estrellas, comentario textual, timestamps y relación `ON DELETE RESTRICT` con `public.peliculas` para proteger el histórico ante eliminaciones accidentales.
- **Elegibilidad Estricta de Negocio:** Un usuario puede calificar una película **únicamente** si cumple la totalidad de las siguientes condiciones:
  1. Está autenticado con rol `cliente`.
  2. Adquirió al menos una entrada para esa película.
  3. La compra se encuentra en estado `'completada'`.
  4. La entrada correspondiente no está cancelada.
  5. **El acceso al cine fue efectivamente validado por personal de sala (`acceso_sala_validado = true`).** *(Haber comprado no alcanza; debe haber asistido).*
- **RPCs Seguras:**
  - `public.verificar_elegibilidad_resena(p_pelicula_id)`: Consulta rápida de elegibilidad y recuperación de reseña previa si ya existe.
  - `public.guardar_resena(p_pelicula_id, p_puntuacion, p_comentario)`: Validación mandatoria de elegibilidad en base de datos e inserción o edición atómica (`UPSERT`).
- **Top 3 Dinámico en Cartelera:** RPC `public.obtener_ranking_top3_peliculas()` que calcula en vivo el podio de películas mejor valoradas: promedio DESC, cantidad de reseñas DESC, fecha de estreno DESC y nombre ASC (LIMIT 3). Con manejo amigable de estado vacío (*"Todavía no hay películas calificadas"*).

### Módulo 8: Fidelización, Puntos, Recompensas y Cupones
- **Equivalencia de Puntos Configurable:** Configuración global en `public.configuracion_cine` (`pesos_por_punto`, inicialmente 1 peso = 1 punto) administrable desde `/admin/fidelizacion`.
- **Acreditación Automática e Idempotente por Backend:**
  - Triggers automáticos en PostgreSQL (`tr_compras_fidelizacion` y `tr_compras_candy_fidelizacion`) que acreditan puntos únicamente cuando una compra de cine o Candy queda confirmada/pagada (`completada` / `pendiente_retiro`).
  - Las compras anónimas no acumulan puntos. No se exige asistencia para acumular puntos (la asistencia es exclusiva para reseñas).
  - Idempotencia estricta mediante índices únicos parciales en el libro mayor `public.movimientos_puntos`:
    - `uq_movimientos_acreditacion_cine` sobre `compra_id` WHERE `tipo_movimiento = 'acreditacion_compra_cine'`.
    - `uq_movimientos_acreditacion_candy` sobre `compra_candy_id` WHERE `tipo_movimiento = 'acreditacion_compra_candy'`.
  - Helper de acreditación `public.acreditar_puntos_compra` revocado de acceso público y ejecutable únicamente vía triggers de servidor.
- **Libro Mayor Inmutable y Saldo Operativo:** `public.movimientos_puntos` como ledger inmutable de créditos y débitos auditables, junto con `perfiles.saldo_puntos` como saldo en caché operacional protegido con `CHECK (saldo_puntos >= 0)`.
- **Catálogo de Recompensas y Canjes Transaccionales:**
  - Catálogo en `public.recompensas` con tipos `'entrada_gratis'`, `'descuento_porcentual'`, `'descuento_monto_fijo'` y `'producto_candy'`.
  - RPC `public.canjear_recompensa` con `SECURITY DEFINER`: valida saldo con bloqueo pesimista `SELECT ... FOR UPDATE` sobre `public.perfiles`, debita puntos, registra el movimiento en el ledger y emite una instancia de cupón en `public.cupones_cliente` con código único `CP-XXXX-XXXX`.
- **Vistas Administrativas:**
  - `/admin/fidelizacion`: Configuración de pesos por punto, estado del programa y CRUD de catálogo de recompensas.
  - `/admin/cupones`: Auditoría global de cupones emitidos con filtros por estado y buscador.

### Área del Cliente (`/mi-cuenta`)
Panel unificado y protegido para usuarios registrados con encabezado de navegación por solapas (`CabeceraCuenta`):
- **Mi Perfil (`/mi-cuenta/perfil`):** Visualización de datos de la cuenta (rol, crédito, saldo de puntos, fecha de registro), formulario de edición segura de datos personales, advertencia sobre datos inmutables y sección interactiva de instalación PWA.
- **Mis Entradas (`/mi-cuenta/entradas`):** Historial completo de compras de cine con filtros por estado de acceso (todas, pendientes de acceso, validadas en sala), buscador por título o código `TK`, visualización de butacas, apertura de modal con voucher digital QR y descarga de comprobante en PDF.
- **Mis Películas (`/mi-cuenta/peliculas`):** Listado deduplicado de películas para las que el cliente adquirió entradas, con acceso rápido a la ficha técnica y botón directo para redactar o editar su reseña comunitaria.
- **Mis Puntos (`/mi-cuenta/puntos`):** Tarjeta destacada con el saldo de puntos acumulado, catálogo interactivo de beneficios canjeables con modal de confirmación y tabla con el historial de movimientos del libro mayor.
- **Mis Cupones (`/mi-cuenta/cupones`):** Listado de cupones personales clasificados por estado (disponibles, utilizados, vencidos), botón de copiado rápido del código `CP-XXXX-XXXX` al portapapeles y detalle de vencimiento.

### PWA (Progressive Web App) Oficial de Angular
- **Integración Oficial:** Implementada con `@angular/service-worker` v22.1.6, en coincidencia exacta con `@angular/core`.
- **Manifiesto Web (`public/manifest.webmanifest`):** Nombre "Pantalla Mágica", short_name "Pantalla Mágica", modo `display: standalone`, orientación `portrait-primary`, colores corporativos (tema `#14101e`, fondo `#0f0b18`).
- **Iconografía Corporativa:** Iconos PNG generados en resoluciones de 72x72 a 512x512, variante adaptable `icon-maskable-512x512.png` y gráfico vectorial `icon.svg`.
- **Activación Exclusiva en Producción:** Habilitado únicamente bajo `configurations.production` en `angular.json` y condicionado en `app.config.ts` mediante `!isDevMode()`. El servidor local de desarrollo (`ng serve`) mantiene el Service Worker completamente apagado para no interferir con la recarga en vivo ni la experiencia de desarrollo.
- **Estrategia de Registro no Invasiva:** Configurado con `registerWhenStable:30000` para iniciar el registro una vez que la aplicación se estabiliza.
- **Estrategia de Caché de Recursos Estáticos (`ngsw-config.json`):**
  - Grupo `app` (App Shell): `installMode: prefetch` y `updateMode: prefetch` para `index.html`, `manifest.webmanifest`, `favicon.ico`, archivos CSS y bundles JS.
  - Grupo `assets`: `installMode: lazy` y `updateMode: prefetch` para imágenes en `/icons/**` y fuentes tipográficas de Google Fonts.
  - **Sin intercepción de datos dinámicos:** No se utiliza `dataGroups`; todas las peticiones a Supabase se realizan en vivo por red para evitar discrepancias de saldos o asientos.
- **Servicio Reactivo `ServicioPwa`:** Captura el evento estándar `beforeinstallprompt`, detecta si la app ya corre en modo standalone y ofrece una sección discreta "Aplicación" en **Mi Perfil** con un botón para disparar la instalación nativa del sistema operativo. Si la app ya está instalada o el navegador no la soporta, no se muestra ningún botón ficticio.

---

## 🔒 Arquitectura de Seguridad y Concurrencia

El sistema implementa una política defensiva de seguridad multicapa tanto a nivel de cliente como de base de datos:

1. **Row Level Security (RLS) en todas las tablas:**
   - Todas las tablas del esquema `public` tienen RLS habilitado.
   - Las consultas públicas (cartelera, funciones programadas, productos activos de candy, recompensas activas) permiten lectura anónima y autenticada filtrando únicamente registros visibles.
   - La gestión administrativa de películas, salas, tarifas, candy, recompensas y cupones está protegida mediante la función de servidor `public.es_administrador()`.
2. **Funciones RPC con `SECURITY DEFINER` y `search_path` seguro:**
   - Todas las operaciones críticas de mutación financiera y de inventario operan como Stored Procedures PL/pgSQL ejecutados con `SECURITY DEFINER` y `SET search_path = public, pg_temp` para prevenir vulnerabilidades de búsqueda de esquemas.
3. **Validación Obligatoria de Sesión con `auth.uid()`:**
   - Las funciones que requieren identidad (`guardar_resena`, `canjear_recompensa`, `actualizar_mi_perfil`, `obtener_mi_fidelizacion`) validan en la primera línea `v_usuario_id := auth.uid()`. Si el token JWT es nulo, la transacción aborta inmediatamente.
4. **Compras Atómicas y Prevención de Doble Venta:**
   - La venta de entradas se procesa en una sola transacción ACID mediante `realizar_compra_entradas`.
   - Adicionalmente a las validaciones procedimentales, el índice único parcial `uq_entradas_funcion_butaca_activa` sobre `(funcion_id, butaca_id) WHERE (estado = 'comprada')` garantiza a nivel del motor relacional la imposibilidad física de vender la misma butaca dos veces para la misma función.
5. **Control de Concurrencia con `SELECT ... FOR UPDATE`:**
   - Se utiliza bloqueo pesimista en base de datos para:
     - Bloquear el stock de productos de Candy antes de descontarlo (`realizar_compra_candy`).
     - Bloquear la compra antes de registrar el acceso o entrega (`validar_acceso_sala` y `validar_entrega_candy`), garantizando el **uso único e irrepetible** de los pases y vouchers.
     - Bloquear el perfil del usuario antes de verificar y debitar saldo de puntos (`canjear_recompensa`).
     - Bloquear el perfil del usuario antes de evaluar la elegibilidad de primera compra.
6. **Separación de Responsabilidades entre `auth.users` y `public.perfiles`:**
   - Las credenciales sensibles y contraseñas residen exclusivamente en `auth.users` bajo control criptográfico de Supabase.
   - `public.perfiles` almacena únicamente metadatos de dominio y se inicializa mediante trigger de servidor.
7. **Edición Blindada del Perfil (`actualizar_mi_perfil`):**
   - En la migración M8.3 se revocó todo permiso de `UPDATE` directo sobre `public.perfiles` para roles `authenticated` y `anon`.
   - La edición de datos personales se canaliza exclusivamente a través de la RPC `public.actualizar_mi_perfil`, que valida campos obligatorios, formatos y fecha no futura, y actualiza de manera estricta únicamente 6 columnas personales (`nombre`, `apellido`, `fecha_nacimiento`, `tipo_sangre`, `color_ojos`, `dias_vacaciones`), manteniendo `rol`, `credito`, `saldo_puntos` y `usuario_id` completamente fuera de la sentencia SQL.
8. **No Almacenamiento de Datos de Tarjetas:**
   - La pasarela de pago simulado valida la tarjeta localmente en memoria mediante el algoritmo de Luhn (módulo 10). Ningún número de tarjeta, fecha de vencimiento ni código CVV es enviado a Supabase, ni almacenado en bases de datos, `localStorage`, `sessionStorage` o archivos de log.

---

## 📱 Guía para Probar la PWA en Entorno Local

Dado que el Service Worker se activa únicamente en la configuración de producción (`isDevMode() = false`) y los Service Workers requieren un origen web seguro (o `localhost`):

> [!NOTE]
> El comando estándar de desarrollo `ng serve` mantiene el Service Worker **desactivado intencionalmente** para no interferir con la recarga en vivo ni cachear código durante el desarrollo.

### Pasos para probar la instalación real:

1. **Compilar la aplicación en modo producción:**
   ```powershell
   npm run build
   ```
   *(Esto compilará el bundle optimizado y generará `ngsw-worker.js`, `ngsw.json` y el manifiesto en `dist/pantalla-magica/browser/`).*

2. **Servir la carpeta de producción con un servidor HTTP local:**
   ```powershell
   npx http-server dist/pantalla-magica/browser -p 8080 -c-1
   ```
   *(El parámetro `-c-1` desactiva la caché HTTP del servidor para permitir que el Service Worker gestione las versiones limpiamente).*

3. **Abrir en el navegador (Google Chrome o Microsoft Edge):**
   - Navegá a `http://localhost:8080`.
   - Abrí las Herramientas de Desarrollador (**F12**) y seleccioná la pestaña **Application** (Aplicación):
     - En **Manifest**: Verificá que cargue el nombre "Pantalla Mágica", los colores de fondo y los iconos sin advertencias.
     - En **Service Workers**: Comprobá que `ngsw-worker.js` figure en estado *Activated and is running*.
   - **Instalación desde la barra del navegador:** Observá el botón nativo de instalación en el extremo derecho de la barra de direcciones de Chrome/Edge (*"Instalar Pantalla Mágica"*).
   - **Instalación desde la aplicación:** Iniciá sesión con un usuario cliente y navegá a **Mi Perfil** (`/mi-cuenta/perfil`). Encontrarás la tarjeta interactiva **"Instalar Pantalla Mágica"** en la sección *📱 Aplicación Pantalla Mágica*, que invoca el diálogo nativo de instalación. Una vez instalada, la UI reconoce el modo standalone y oculta el botón.

---

## 🗄️ Historial de Migraciones en Base de Datos

El esquema relacional de Supabase se estructura a través de las siguientes migraciones versionadas en `supabase/migrations/`:

| Archivo de Migración | Estado | Descripción técnica |
| :--- | :--- | :--- |
| `20261005_m5_4_validacion_acceso_sala.sql` | **Ejecutada en Supabase** | Campos de validación de acceso en `public.compras` y RPC `public.validar_acceso_sala` con bloqueo `FOR UPDATE`. |
| `20261005_m6_1_productos_candy.sql` | **Ejecutada en Supabase** | Tabla `public.productos_candy`, bucket `candy` en Storage y políticas RLS públicas y de administración. |
| `20261005_m6_2_compras_candy.sql` | **Ejecutada en Supabase** | Tablas `public.compras_candy` y `detalles_compra_candy`, códigos `CD-XXXX-XXXX` y RPC transaccional `realizar_compra_candy` con control de stock pesimista. |
| `20261006_m6_4_validacion_entrega_candy.sql` | **Ejecutada en Supabase** | RPC `public.validar_entrega_candy` para canje y entrega en mostrador con auditoría de empleado y `FOR UPDATE`. |
| `20261006_m7_resenas_ranking.sql` | **Ejecutada en Supabase** | Tabla `public.resenas` con FK `ON DELETE RESTRICT`, RPC de elegibilidad por compra + acceso validado, RPC `guardar_resena` y cálculo de Top 3 dinámico en cartelera. |
| `20261006_m8_1_fidelizacion_cupones.sql` | **Ejecutada en Supabase** | Sistema de fidelización: parámetros comerciales en `configuracion_cine`, `saldo_puntos` en `perfiles`, catálogo `recompensas`, cupones `cupones_cliente` (`CP-XXXX-XXXX`), libro mayor `movimientos_puntos`, triggers automáticos de compra (con cláusula `WHEN` corregida) y RPC `canjear_recompensa`. |
| `20261006_m8_3_perfil_cliente.sql` | **Ejecutada en Supabase** | Revocación total de `UPDATE` directo sobre `public.perfiles` y creación de la RPC `public.actualizar_mi_perfil` con `SECURITY DEFINER` para blindar rol, crédito y puntos. |

---

## 🧪 Estado Real de Pruebas y Compilación

Verificación ejecutada en el repositorio local previo al cierre del estado del proyecto:

### Pruebas Automatizadas (Vitest)
```powershell
npm test -- --watch=false
```
- **Suites de prueba:** **27 archivos aprobados (27 de 27)**
- **Casos de prueba individuales:** **147 tests aprobados (147 de 147)**
- **Tasa de éxito:** **100% de aprobación**

### Compilación de Producción (Angular CLI)
```powershell
npm run build
```
- **Resultado:** **Compilación exitosa (código de salida 0)**.
- **Salida:** Artefactos optimizados generados en `dist/pantalla-magica/browser/` incluyendo Service Worker (`ngsw-worker.js`), manifiesto de hashes (`ngsw.json`), manifiesto PWA (`manifest.webmanifest`) y bundles JS/CSS limpios sin errores de TypeScript.

---

## 🚀 Próximos Pasos

Para mantener total transparencia académica y fidelidad con el estado real del repositorio, las siguientes funcionalidades del alcance de la materia se encuentran **pendientes de implementación** y no deben considerarse operativas:

1. **Aplicación efectiva de cupones en checkout (M8.2):**
   - Aunque la emisión, catálogo, canje por puntos y tenencia de cupones `CP-XXXX-XXXX` están implementados en M8.1, la pantalla de pago de cine (`/compra/pago`) y la de Candy (`/candy/pago`) todavía no disponen de campo para ingresar/aplicar cupones de descuento ni de la RPC que consuma y marque el cupón como `'utilizado'` en la transacción de compra.
2. **Beneficio / Promoción para mayores de 50 años:**
   - Falta implementar la regla comercial y visual que calcule y otorgue un cupón o descuento especial a clientes registrados cuya fecha de nacimiento indique 50 o más años de edad.
3. **Cancelación de entradas hasta 2 horas antes y devolución a crédito:**
   - La tabla `perfiles` cuenta con la columna `credito numeric(10,2) DEFAULT 0.00`, pero no existe aún el botón ni la RPC transaccional que permita al cliente cancelar una entrada comprada con al menos 2 horas de anticipación al horario de la función, liberar las butacas y transferir el importe a su saldo de crédito.
4. **Utilización del saldo de crédito en compras:**
   - No está integrado el saldo de crédito (`perfiles.credito`) como medio de pago parcial o total en el checkout de entradas o Candy Bar.
5. **Alertas de próximos estrenos:**
   - Falta desarrollar el mecanismo de suscripción o notificación (email o notificación en cuenta) para alertar a los clientes cuando una película de la sección "Próximamente" abre sus funciones para la venta.
6. **Administración y visualización completa de preventas:**
   - La configuración de preventa existe en el formulario administrativo de películas y el motor de cálculo de precios reconoce la preventa en backend si se cumplen los días de anticipación; sin embargo, resta crear filtros y badges destacados en Cartelera para identificar preventas de manera promocional y un panel exclusivo de gestión de preventas.
7. **Dashboard administrativo con métricas reales:**
   - La vista `/admin` contiene un maquetado preliminar de ejemplo. Falta conectar las consultas de agregación reales para mostrar métricas en vivo (entradas vendidas del día, recaudación total, porcentaje de ocupación por sala, películas más vistas).
8. **Reportes exportables (PDF / Excel) y gráficos estadísticos:**
   - Falta implementar la exportación formal de informes administrativos de ventas y ocupación a formatos PDF y hojas de cálculo (Excel/CSV), así como componentes de gráficos analíticos.
9. **Log general de actividad administrativa y auditoría:**
   - Aunque las validaciones de acceso y entrega registran el usuario operador, falta implementar una tabla y vista de auditoría general que registre altas, bajas, modificaciones de funciones, tarifas y cambios de configuración.
10. **Módulo administrativo para gestión y alta de usuarios:**
    - No existe en el panel `/admin` una interfaz para listar usuarios registrados, cambiar roles ni dar de alta cuentas de empleados desde la administración.
11. **Revisión global y unificación del formato visual de fechas:**
    - Armonización sistemática del formato de visualización de fechas y horas en toda la aplicación bajo un estándar regional uniforme (`DD/MM/AAAA HH:mm`).

---

## 💻 Instalación y Ejecución Local

### Requisitos previos
- [Node.js](https://nodejs.org/) (versión 20 o superior).
- [npm](https://www.npmjs.com/).

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/keilaaristimuno/Cine-prograIV.git
   cd Cine-prograIV
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Variables de entorno:**
   Configurar `src/environments/environment.ts` con las credenciales de Supabase:
   ```typescript
   export const environment = {
     production: false,
     supabaseUrl: 'https://TU-PROYECTO.supabase.co',
     supabasePublishableKey: 'TU-CLAVE-ANON-PUBLICA'
   };
   ```

4. **Ejecutar el servidor de desarrollo:**
   ```bash
   ng serve
   ```
   Acceder a `http://localhost:4200` en el navegador.

---

## 👩‍💻 Autoría

Proyecto desarrollado por **Keila Aristimuño** para la carrera **Tecnicatura Universitaria en Programación (UTN)** — Cátedra de **Programación IV** (2025/2026).

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?logo=linkedin&logoColor=white)](https://www.linkedin.com/in/keila-aristimu%C3%B1o-327184211/) [![GitHub](https://img.shields.io/badge/GitHub-keilaaristimuno-181717?logo=github&logoColor=white)](https://github.com/keilaaristimuno)

¿Tenés sugerencias o encontraste un error? ¡Abrí un *issue*, todo feedback es bienvenido!
