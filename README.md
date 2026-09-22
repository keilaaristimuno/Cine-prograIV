<div align="center">

# 🎬 Pantalla Mágica

### Plataforma web para la administración y operación integral de un cine

Aplicación desarrollada con Angular y Supabase que centraliza la gestión de películas, funciones, salas, ventas, entradas, clientes y empleados.

[Ver aplicación desplegada](https://pantallamagica-25cb8.web.app) · [Reportar un problema](https://github.com/keilaaristimuno/Cine-prograIV.git)

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular\&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript\&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase\&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Hosting-FFCA28?logo=firebase\&logoColor=black)
![Estado](https://img.shields.io/badge/Estado-En%20desarrollo-8B5CF6)

</div>

---

## Descripción

**Pantalla Mágica** es una aplicación web orientada a la administración y operación de un cine.

El sistema contempla diferentes experiencias según el tipo de usuario:

* Los visitantes pueden consultar la cartelera y el contenido público.
* Los clientes registrados pueden comprar entradas y gestionar sus compras.
* Los empleados pueden validar entradas mediante códigos QR.
* Los administradores pueden gestionar películas, funciones, salas, productos, promociones y reportes.

El proyecto se encuentra actualmente en desarrollo. La primera etapa está enfocada en el módulo administrativo y en la gestión de películas.

---

## Estado actual del proyecto

### Funcionalidades implementadas

* [x] Proyecto Angular configurado con componentes standalone.
* [x] Integración de Angular con Supabase.
* [x] Autenticación mediante correo electrónico y contraseña.
* [x] Persistencia de la sesión del usuario.
* [x] Panel administrativo con layout y navegación propia.
* [x] Registro de películas.
* [x] Listado administrativo de películas.
* [x] Edición de películas existentes.
* [x] Carga automática de los datos en el formulario de edición.
* [x] Publicación y ocultamiento mediante el estado de la película.
* [x] Selección de múltiples géneros.
* [x] Subida de pósteres a Supabase Storage.
* [x] Validación de formato y tamaño de las imágenes.
* [x] Validaciones mediante formularios reactivos.
* [x] Tabla de perfiles y roles.
* [x] Políticas RLS para proteger la modificación de películas.
* [x] Conservación del creador original mediante `creado_por`.
* [x] Despliegue inicial en Firebase Hosting.

### En desarrollo

* [ ] Eliminación lógica de películas.
* [ ] Mensajes de confirmación antes de publicar, ocultar o eliminar.
* [ ] Guards para proteger las rutas administrativas.
* [ ] Cierre de sesión desde el panel administrativo.
* [ ] Catálogo público de películas.
* [ ] Página de detalle de película.
* [ ] Gestión de funciones y horarios.
* [ ] Gestión de salas y butacas.
* [ ] Proceso completo de compra.
* [ ] Generación de entradas PDF con código QR.
* [ ] Validación de entradas por empleados.
* [ ] Sistema de promociones, cupones y fidelización.
* [ ] Reportes administrativos.
* [ ] Configuración como aplicación PWA.

---

## Roles y permisos

| Rol             | Permisos principales                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `administrador` | Crear, editar, publicar, ocultar y eliminar lógicamente cualquier película. Administra el funcionamiento general del sistema. |
| `empleado`      | Validar entradas y pedidos mediante QR. No puede administrar películas.                                                       |
| `cliente`       | Consultar películas, comprar entradas y gestionar sus compras.                                                                |
| Anónimo         | Consultar el contenido público y comenzar una compra.                                                                         |

Los permisos sensibles se validan mediante políticas **Row Level Security (RLS)** en Supabase. La seguridad no depende únicamente de ocultar botones o rutas en la interfaz.

---

## Tecnologías utilizadas

### Frontend

* Angular 22.
* TypeScript.
* HTML.
* SCSS.
* Angular Router.
* Angular Reactive Forms.
* Angular Material.
* Signals para el manejo del estado local.

### Backend y base de datos

* Supabase.
* PostgreSQL.
* Supabase Authentication.
* Supabase Storage.
* Row Level Security.

### Despliegue

* Firebase Hosting.
* Git y GitHub para control de versiones.

---

## Arquitectura del proyecto

El proyecto utiliza componentes standalone y una organización basada en funcionalidades.

```text
src/
└── app/
    ├── core/
    │   ├── modelos/
    │   └── servicios/
    │
    ├── features/
    │   ├── autenticacion/
    │   │   └── paginas/
    │   │       ├── inicio-sesion/
    │   │       └── registro/
    │   │
    │   └── admin/
    │       ├── layouts/
    │       │   └── admin-layout/
    │       │
    │       └── pages/
    │           ├── dashboard-admin/
    │           └── peliculas/
    │               ├── listado-peliculas/
    │               └── formulario-pelicula/
    │
    ├── app.config.ts
    └── app.routes.ts
```

### Responsabilidades principales

* `core/modelos`: contiene las interfaces y tipos utilizados por la aplicación.
* `core/servicios`: concentra la comunicación con Supabase y la lógica de acceso a datos.
* `features/autenticacion`: contiene las pantallas y funcionalidades relacionadas con el acceso al sistema.
* `features/admin`: contiene el panel y las funcionalidades exclusivas del administrador.
* `layouts`: define la estructura visual compartida por las páginas administrativas.
* `pages`: contiene las pantallas asociadas a las rutas principales.

---

## Modelo de datos actual

### `auth.users`

Tabla administrada por Supabase Authentication. Contiene las credenciales e identificadores de los usuarios.

### `perfiles`

Complementa a `auth.users` y almacena el rol utilizado por la aplicación.

| Campo        | Descripción                                      |
| ------------ | ------------------------------------------------ |
| `usuario_id` | Identificador relacionado con `auth.users.id`.   |
| `rol`        | Rol asignado: administrador, empleado o cliente. |
| `creado_en`  | Fecha de creación del perfil.                    |

### `peliculas`

| Campo                | Descripción                                     |
| -------------------- | ----------------------------------------------- |
| `id`                 | Identificador único de la película.             |
| `nombre`             | Nombre de la película.                          |
| `sinopsis`           | Descripción argumental.                         |
| `duracion_minutos`   | Duración expresada en minutos.                  |
| `fecha_estreno`      | Fecha de estreno.                               |
| `clasificacion_edad` | Clasificación por edad.                         |
| `esta_activa`        | Determina si debe mostrarse públicamente.       |
| `generos`            | Géneros asociados a la película.                |
| `imagen_url`         | Dirección pública del póster.                   |
| `creado_por`         | Usuario que registró originalmente la película. |
| `creado_en`          | Fecha y hora de creación.                       |

### Supabase Storage

Los pósteres se almacenan en el bucket:

```text
posters
```

Cada archivo utiliza una ruta única para evitar colisiones entre nombres.

---

## Seguridad

La aplicación utiliza políticas RLS para proteger la información almacenada en Supabase.

Actualmente:

* Solamente los usuarios autenticados con rol `administrador` pueden modificar películas.
* Un administrador puede modificar cualquier película, independientemente de quién la haya creado.
* La columna `creado_por` se conserva con fines de auditoría.
* Los usuarios no pueden asignarse a sí mismos el rol de administrador.
* Las validaciones del frontend se complementan con validaciones en la base de datos.

Esta estrategia evita depender exclusivamente de la interfaz de Angular para proteger las operaciones administrativas.

---

## Decisiones técnicas

### Componentes standalone

La aplicación utiliza la arquitectura standalone de Angular, reduciendo la necesidad de módulos y facilitando la carga diferida de componentes mediante el sistema de rutas.

### Formulario reutilizable

El mismo componente se utiliza para registrar y editar películas.

El comportamiento cambia según la ruta:

```text
/admin/peliculas/nueva
```

Registra una nueva película.

```text
/admin/peliculas/:id/editar
```

Obtiene la película correspondiente, completa el formulario y actualiza sus datos.

### Eliminación lógica

Las películas no se eliminarán físicamente de la base de datos. Se implementará un estado de eliminación lógica para conservar:

* Historial de ventas.
* Entradas emitidas.
* Reportes.
* Registros de auditoría.
* Relaciones con funciones anteriores.

### Seguridad desde la base de datos

Los permisos se validan mediante Supabase RLS. Aunque una persona intente ejecutar una operación directamente contra la API, la base de datos verifica su rol antes de autorizarla.

---

## Instalación local

### Requisitos

* Node.js.
* npm.
* Angular CLI.
* Una cuenta y un proyecto de Supabase.

### Clonar el repositorio

```bash
git clone https://github.com/keilaaristimuno/Cine-prograIV.git
cd pantalla-magica
```

### Instalar las dependencias

```bash
npm install
```

### Configurar Supabase

Crear el archivo de ambiente correspondiente y completar:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'URL_DEL_PROYECTO',
  supabaseAnonKey: 'CLAVE_PUBLICA_ANON'
};

```
### Iniciar el proyecto

```bash
ng serve
```

La aplicación estará disponible en:

```text
http://localhost:4200
```

---

## Compilación

Para verificar que el proyecto pueda compilarse correctamente:

```bash
npm run build
```

Los archivos generados se guardarán en la carpeta:

```text
dist/
```

---

## Despliegue

La aplicación se encuentra desplegada mediante Firebase Hosting:

https://pantallamagica-25cb8.web.app

Para generar una nueva versión y publicarla:

```bash
npm run build
firebase deploy
```

---

## Próximas etapas

### Etapa 1 — Administración de películas

* [x] Registrar películas.
* [x] Listar películas.
* [x] Editar películas.
* [x] Publicar u ocultar películas.
* [ ] Eliminar películas lógicamente.

### Etapa 2 — Cartelera pública

* [ ] Página de inicio.
* [ ] Cartelera dinámica.
* [ ] Búsqueda por nombre.
* [ ] Filtro por género.
* [ ] Detalle de película.
* [ ] Películas próximas a estrenarse.
* [ ] Reseñas y calificaciones.

### Etapa 3 — Funciones y salas

* [ ] Administración de salas.
* [ ] Generación de butacas.
* [ ] Administración de funciones.
* [ ] Validación de horarios.
* [ ] Intervalo de limpieza entre funciones.
* [ ] Asignación automática de salas.

### Etapa 4 — Compra de entradas

* [ ] Selección de función.
* [ ] Mapa interactivo de butacas.
* [ ] Disponibilidad en tiempo real.
* [ ] Productos de Candy.
* [ ] Resumen y confirmación de compra.
* [ ] Generación de entrada PDF.
* [ ] Generación y validación de QR.

### Etapa 5 — Funcionalidades avanzadas

* [ ] Cupones.
* [ ] Sistema de puntos.
* [ ] Preventas.
* [ ] Cancelaciones y crédito.
* [ ] Reportes.
* [ ] Exportación PDF y Excel.
* [ ] Registro de actividad administrativa.
* [ ] PWA.
* [ ] Pruebas y optimización final.

---

## Capturas de pantalla

Las capturas del sistema se incorporarán progresivamente a medida que se completen las diferentes secciones.

Carpeta:

```text
docs/capturas/
```

Para agregar una captura:

```markdown
![Listado administrativo de películas](docs/capturas/listado-peliculas.png)
```

Se incluira capturas de:

* Inicio de sesión.
* Dashboard administrativo.
* Listado de películas.
* Registro de películas.
* Edición de películas.
* Cartelera pública.
* Selección de butacas.
* Entrada con código QR.

---

## Objetivos del proyecto

Este proyecto busca aplicar de manera integrada:

* Arquitectura y organización de una aplicación Angular.
* Programación orientada a componentes.
* Formularios reactivos.
* Autenticación y autorización.
* Modelado de una base de datos relacional.
* Seguridad mediante políticas RLS.
* Almacenamiento de archivos.
* Diseño responsive.
* Reglas de negocio.
* Control de versiones.
* Despliegue de una aplicación web.

---

## Autor

Proyecto académico desarrollado por:

* **Keila Aristimuño**
* GitHub: [USUARIO_DE_GITHUB](https://github.com/keilaaristimuno)

---

## Estado

> 🚧 Proyecto en desarrollo activo.

Las funcionalidades y la documentación se actualizarán a medida que avance la implementación.

