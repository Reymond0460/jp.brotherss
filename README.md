# JP Brothers Barbería

Sitio web de reservas y panel de administración para la barbería **JP Brothers** ([@jp.brotherss](https://www.instagram.com/jp.brotherss/)).

Hecho con **HTML + CSS + JavaScript puro** (sin frameworks, sin bundler). Datos en **Firebase** (Hosting, Firestore y Authentication).

## Qué incluye

**Sitio público** (`public/index.html`)
- Portada con estado "abierto / cerrado" y la próxima hora libre.
- Promos vigentes, servicios con precios y reserva en 3 pasos (servicio → día y hora → datos).
- "Ver mi reserva" solo con el código (permite cancelar o pedir cambios por WhatsApp).
- Ubicación con botones a Google Maps, Apple Maps y Waze, y mapa incrustado (con consentimiento).
- Políticas de privacidad y de cookies, aviso de cookies, cabeceras de seguridad.

**Panel del barbero** (`public/admin.html`)
- Resumen: cortes y dinero de hoy y del mes, gráficos de rendimiento.
- Agenda por día: confirmar, cobrar, reprogramar, cancelar, escribir al cliente por WhatsApp.
- Horarios: días y horas de trabajo, días cerrados, bloqueo de horas sueltas.
- Servicios, promos y ajustes del negocio.

## Cómo correrlo

```powershell
npm install        # solo la primera vez (únicamente instala esbuild, ver "Tecnologías")
npm run dev        # http://localhost:5173  (admin en /admin.html)
npm test           # pruebas de la lógica
```

En `localhost` el sitio funciona en **modo demo**: guarda datos de ejemplo en el navegador y el login del panel acepta cualquier correo y contraseña. Para probar contra Firebase real (datos de QA): `http://localhost:5173/?backend=firebase`.

## Entornos (misma base de código, distintos datos)

| Entorno | Dónde | Datos |
|---|---|---|
| `prod` | sitio oficial de Firebase Hosting (target `prod`) | Firestore `envs/prod/...` |
| `qa` | sitio de pruebas de Firebase Hosting (target `qa`) | Firestore `envs/qa/...` |
| `dev` | `localhost` | local (demo) |
| `demo` | cualquier otro (por ejemplo el artefacto de Claude) | local (demo) |

El entorno se decide por el dominio en `public/js/config/env.js`. **Cuando el cliente tenga dominio propio, se agrega ahí** (`HOSTS.prod`) y en Firebase Hosting.

Ramas de Git: `main` → producción, `QA` → pruebas. Se trabaja en `QA`, se prueba en el sitio de QA y luego se pasa a `main`.

## Estructura (dónde cambiar cada cosa)

```
public/                     ← lo que se publica (Firebase Hosting)
  index.html  admin.html  privacidad.html  cookies.html
  css/
    base/                   tokens (colores, tipografías), reset, tipografía, layout
    components/             botones, formularios, ticket, poste de barbero, etc.
    site/                   estilos del sitio público (una hoja por sección)
    admin/                  estilos del panel
  js/
    config/                 constants, defaults (servicios/horarios de ejemplo), env, firebase-config
    core/                   utilidades sin dependencias: dom, fechas, formato, ids
    domain/                 REGLAS DE NEGOCIO puras (disponibilidad, precios, estadísticas, validaciones)
    data/                   acceso a datos: contract (interfaz), firebase-backend, local-backend
    services/               casos de uso (reservar, buscar horas…) que unen domain + data
    ui/                     piezas visuales reutilizables (iconos, modal, toast, gráficos, ticket)
    site/                   sitio público: main.js + components/
    admin/                  panel: main.js, router, vistas en views/
firestore.rules             reglas de seguridad de la base de datos
firebase.json               hosting (prod y qa), cabeceras de seguridad
scripts/                    dev-server, build-artifact (y utilidades de Firebase)
tests/                      pruebas automáticas
```

**Cambios frecuentes**
- Colores y tipografías: `public/css/base/tokens.css`.
- Servicios, precios, horarios y promos: se editan desde el panel. Los valores iniciales de ejemplo están en `public/js/config/defaults.js`.
- Número de WhatsApp, dirección, Instagram: panel → Ajustes (valores iniciales en `defaults.js`).
- Textos legales: `public/privacidad.html` y `public/cookies.html`.
- Cambiar de base de datos: se escribe otro backend que cumpla `public/js/data/contract.js`.

## Cómo funciona la reserva (sin doble reserva)

La jornada se divide en bloques de 30 min. Cada reserva ocupa uno o más bloques, y cada bloque ocupado es un documento `slots/{fecha_hhmm}`. Reserva y bloques se guardan en **una sola operación atómica**; si el bloque ya existe, Firestore rechaza todo y el cliente ve "esa hora acaba de ser tomada".

Los datos personales viven solo en `bookings/{código}`, que se puede **leer únicamente conociendo el código** (no se puede listar). Los bloques ocupados son públicos pero solo contienen fecha y hora.

## Seguridad

- `firestore.rules`: lectura pública solo del catálogo; reservas validadas campo por campo (incluido que el precio coincida con el del servicio); el panel exige una cuenta registrada en `admins/{uid}`.
- `firebase.json`: Content-Security-Policy estricta (sin scripts ni estilos en línea), HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP/CORP. QA además lleva `noindex`.
- Tipografías autoalojadas (sin Google Fonts). El mapa de Google solo se carga con consentimiento.
- No hay contraseñas ni claves privadas en el repositorio. La configuración web de Firebase es pública por diseño.

## Tecnologías

Todo es HTML, CSS y JavaScript estándar. Lo único adicional:
- **SDK de Firebase** cargado desde el CDN oficial de Google como módulo ES (`public/js/data/firebase-sdk.js`). No requiere npm.
- **esbuild** (solo desarrollo): únicamente para `npm run artifact`, que empaqueta el sitio en archivos únicos para probarlo en Claude. El sitio real no lo necesita.

## Pendiente para la siguiente etapa

- Automatización de WhatsApp (API de WhatsApp Business): los mensajes ya se arman en `domain/whatsapp.js`; se conectará al cambiar el estado de una reserva.
- Pasarela de pago con Mercado Pago: se agregaría al paso final de la reserva y un estado de pago en `bookings`.
- Confirmar comuna de la dirección, RUT/razón social y revisar los textos legales con un abogado.
