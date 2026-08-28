# Gestión de Promociones — POS

Módulo de gestión de promociones para un punto de venta: permite crear promociones por producto o por categoría (porcentaje o monto fijo), controlar su ciclo de vida manual (Programada → Activa → Finalizada) y consultar cuáles están vigentes hoy. Backend en NestJS + TypeORM + PostgreSQL, frontend en React + Vite, todo orquestado con Docker Compose.

Las decisiones de diseño y sus trade-offs están documentadas en [DECISIONS.md](DECISIONS.md).

## Requisitos previos

| Herramienta    | Versión mínima | Notas                                          |
| -------------- | -------------- | ---------------------------------------------- |
| Docker Engine  | 24.x           |                                                |
| Docker Compose | v2.20          | Se usa `--wait`, que requiere Compose v2       |
| Node.js        | 22.x           | Solo para desarrollo local y correr los tests fuera de Docker |

No hace falta PostgreSQL ni Node instalados para levantar el proyecto: todo corre en contenedores.

## Levantar el proyecto

```bash
git clone <url-del-repo>
cd <repo>
cp .env.example .env
```

Editar `.env` y completar las dos variables que vienen vacías (cualquier valor sirve para desarrollo local; la base de datos se crea con esas credenciales en el primer arranque):

```
POSTGRES_USER=promotions_user
POSTGRES_PASSWORD=<elige-una>
```

El resto de variables trae valores por defecto razonables. Luego:

```bash
docker compose up --build
```

El backend corre las migraciones y el seed (4 categorías, 10 productos) automáticamente antes de aceptar peticiones. Si falta alguna variable, Compose falla de inmediato con un mensaje explícito (`POSTGRES_USER is required`), no con un error de conexión.

## Variables de entorno

| Variable            | Para qué sirve                                                              | Ejemplo                 | Obligatoria |
| ------------------- | --------------------------------------------------------------------------- | ----------------------- | ----------- |
| `POSTGRES_USER`     | Usuario de PostgreSQL (se crea en el primer arranque)                        | `promotions_user`       | Sí          |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL                                                     | —                       | Sí          |
| `POSTGRES_DB`       | Nombre de la base de datos                                                   | `promotions`            | Sí          |
| `POSTGRES_HOST`     | Host de la base vista desde el backend (nombre del servicio en Compose)      | `db`                    | Sí          |
| `POSTGRES_PORT`     | Puerto de PostgreSQL dentro de la red de Compose                             | `5432`                  | Sí          |
| `BACKEND_PORT`      | Puerto del API, dentro del contenedor y publicado en el host                 | `3000`                  | Sí          |
| `APP_TIMEZONE`      | Zona horaria para calcular "hoy" en la lógica de vigencia                    | `America/Bogota`        | Sí          |
| `CORS_ORIGIN`       | Lista de orígenes permitidos para CORS, separados por coma. Vacía = CORS deshabilitado (el frontend es same-origin vía nginx). Solo necesaria para el dev server de Vite | `http://localhost:5173` | No          |
| `FRONTEND_PORT`     | Puerto del host donde se publica el frontend                                 | `8080`                  | Sí          |
| `VITE_API_URL`      | Ruta base que usa el frontend para llamar al API (nginx proxea `/api`)       | `/api`                  | Sí          |

## URLs de acceso

Con los valores por defecto:

| Servicio            | URL                                  |
| ------------------- | ------------------------------------ |
| Frontend            | http://localhost:8080                |
| API                 | http://localhost:3000/api            |
| Swagger             | http://localhost:3000/api/docs       |
| Health check        | http://localhost:3000/health         |

`/health` vive en la raíz, fuera del prefijo `/api`, por requisito del enunciado. Devuelve 200 con la base arriba y 503 si no responde (hace un `SELECT 1` real con timeout de 2 s).

## Tests

Fuera de Docker (requiere Node 22 y `npm ci` previo en cada carpeta):

```bash
# Backend: 53 tests unitarios + 17 e2e (supertest, sin base de datos)
cd backend
npm test
npm run test:e2e

# Frontend: Vitest + Testing Library
cd frontend
npm test
```

Dentro de Docker: la imagen de producción no incluye devDependencies (deliberado: es una imagen de runtime), así que los tests se corren en un contenedor efímero de Node con el código montado:

```bash
docker run --rm -v "$PWD/backend:/app" -w /app node:22-alpine sh -c "npm ci && npm test && npm run test:e2e"
docker run --rm -v "$PWD/frontend:/app" -w /app node:22-alpine sh -c "npm ci && npm test"
```

Lint y formato (mismos comandos que ejecuta el CI):

```bash
npm run lint && npm run format:check && npm run typecheck   # en backend/ y en frontend/
```

## Troubleshooting

**"port is already allocated" al levantar.** Otro proceso usa el 3000 o el 8080. Cambia `BACKEND_PORT` o `FRONTEND_PORT` en `.env` y vuelve a levantar. No hace falta tocar ningún otro archivo: nginx y Compose leen el puerto de la misma variable.

**Compose falla con "POSTGRES_USER is required".** El `.env` no existe o tiene variables sin valor. Es el comportamiento diseñado: `cp .env.example .env` y completa las credenciales. Todas las variables usan la sintaxis `${VAR:?}` en `docker-compose.yml` precisamente para fallar rápido y con nombre, en lugar de un error de conexión críptico.

**El backend no autentica contra la base ("password authentication failed") después de cambiar credenciales.** PostgreSQL crea el usuario solo en el primer arranque; si cambiaste `POSTGRES_USER`/`POSTGRES_PASSWORD` con un volumen ya inicializado, la base sigue teniendo las credenciales viejas. Borra el volumen y arranca de cero:

```bash
docker compose down -v
docker compose up --build
```

`-v` elimina los datos: en desarrollo no hay nada que perder (el seed es idempotente y se re-ejecuta al arrancar).

## Estructura de carpetas

```
.
├── backend/
│   ├── src/
│   │   ├── categories/          # entidad + endpoint de catálogo
│   │   ├── products/            # entidad + endpoint de catálogo
│   │   ├── promotions/          # dominio: servicio, máquina de estados,
│   │   │                        #   invariantes, vigencia derivada, DTOs
│   │   ├── health/              # GET /health (raíz, sin prefijo)
│   │   ├── common/              # clock (APP_TIMEZONE), filtro global de excepciones
│   │   ├── config/              # DataSource de TypeORM (app + CLI de migraciones)
│   │   ├── migrations/          # SQL a mano: tablas, CHECKs, índices
│   │   └── scripts/             # seed idempotente
│   ├── test/                    # e2e con supertest (capa HTTP real, storage en memoria)
│   ├── Dockerfile               # multi-stage, usuario no-root
│   └── docker-entrypoint.sh     # migraciones + seed antes de escuchar; falla ruidoso
├── frontend/
│   ├── src/
│   │   ├── api/                 # cliente fetch, tipos espejo del API
│   │   ├── components/          # resumen, tabla, formulario, badge (+ tests)
│   │   └── ui/                  # etiquetas en español: única capa con traducción
│   ├── Dockerfile               # build con Vite, servido por nginx
│   └── nginx.conf.template      # SPA fallback + proxy /api -> backend
├── scripts/
│   └── check-env.sh             # valida el entorno contra .env.example (CI)
├── .github/workflows/ci.yml     # lint -> test -> build -> smoke (+ gitleaks)
├── docker-compose.yml
├── .env.example
└── DECISIONS.md
```
