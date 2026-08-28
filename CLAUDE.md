# CLAUDE.md — Contexto del proyecto

Módulo de gestión de promociones para POS (prueba técnica).

## Stack

- **Backend:** NestJS (TypeScript), TypeORM, PostgreSQL 16
- **Frontend:** React 18 + Vite + TypeScript
- **Orquestación:** docker-compose (postgres, backend, frontend)
- **CI:** GitHub Actions

## Convenciones

- Código, nombres de variables, comentarios y mensajes de commit: **INGLÉS**
- `README.md` y `DECISIONS.md`: **ESPAÑOL**
- Enums en código en inglés (`SCHEDULED`/`ACTIVE`/`ENDED`, `PERCENTAGE`/`FIXED_AMOUNT`), traducidos a español **solo en la capa de UI**

## Modelo de datos

- `categories(id, name, created_at)`
- `products(id, name, category_id FK, created_at)`
- `promotions(id, name, product_id NULL, category_id NULL, discount_type, discount_value, start_date DATE, end_date DATE, status, created_at, updated_at)`

Constraints (CHECK a nivel de base de datos):

- Exactamente **uno** de `product_id` / `category_id` debe ser NOT NULL
- `end_date > start_date`
- Si `discount_type = 'PERCENTAGE'` entonces `discount_value` entre 1 y 100
- `discount_value > 0`

## Reglas de negocio (críticas)

- El campo `status` se cambia **MANUALMENTE**. Transiciones válidas: `SCHEDULED -> ACTIVE -> ENDED`. No hay saltos ni retrocesos.
- `vigente` **NO** es un campo. Es **DERIVADO**: `status === ACTIVE && hoy ∈ [start_date, end_date]`. "Hoy" se calcula en la zona horaria de la variable de entorno `APP_TIMEZONE` (America/Bogota).
- Una promoción en `ENDED` no puede modificarse ni eliminarse (**409 Conflict**).
- Una promoción solo puede eliminarse si está en `SCHEDULED`.

## Principios

- **Sin secretos en el repo. Nunca.** Todo por variables de entorno.
- Todo debe levantar con `docker compose up` desde un clon limpio.
- Prioridad: **calidad sobre cantidad**. Alcance mínimo, ejecución impecable.
