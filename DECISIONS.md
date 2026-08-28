# Decisiones de diseño

Formato de cada entrada: contexto → alternativas consideradas → elección → trade-off asumido.

## NestJS en lugar de Express

**Contexto.** El backend es un CRUD con reglas de negocio no triviales (máquina de estados, invariantes cross-field, campo derivado) que debe ser testeable y legible por un evaluador en poco tiempo.

**Alternativas.** Express puro con estructura propia; Fastify; NestJS.

**Elección.** NestJS. Aporta de serie lo que con Express habría que construir y justificar a mano: inyección de dependencias (que hace trivial mockear repositorios en los tests), `ValidationPipe` integrado con class-validator, filtros de excepciones globales, y una convención de módulos que cualquier revisor reconoce sin leer documentación del proyecto.

**Trade-off.** Más boilerplate del que un CRUD de este tamaño necesita: módulos, decoradores y ~15 archivos donde Express usaría 5. Lo asumo porque el costo es de escritura (una vez) y el beneficio es de lectura y prueba (siempre): los tests del servicio no tocan red ni base de datos precisamente gracias al contenedor de DI.

## PostgreSQL en lugar de MongoDB

**Contexto.** El modelo tiene relaciones (producto pertenece a categoría, promoción apunta a producto o categoría) y reglas que deben cumplirse siempre, no solo cuando el código de aplicación se porta bien.

**Alternativas.** MongoDB; PostgreSQL; SQLite (descartada de entrada: no representa un entorno de producción).

**Elección.** PostgreSQL. Tres razones concretas: (1) la relación producto–categoría y las FKs de promociones son integridad referencial clásica, con `ON DELETE RESTRICT` declarativo; (2) los CHECK constraints expresan las reglas de negocio en el propio esquema — el XOR de objetivo, `end_date > start_date`, el rango del porcentaje — y las hacen inviolables por cualquier cliente, incluido un `psql` manual; (3) las escrituras de migración+seed son transaccionales.

**Trade-off.** Esquema rígido: cambiar el modelo exige migración. Es exactamente el comportamiento deseado aquí; la flexibilidad de esquema de MongoDB no compra nada en un dominio con estructura estable y conocida.

## Migraciones explícitas, nunca `synchronize: true`

**Contexto.** TypeORM puede sincronizar el esquema automáticamente desde las entidades (`synchronize: true`), lo cual es cómodo en un prototipo.

**Alternativas.** `synchronize: true`; migraciones generadas automáticamente; migraciones escritas a mano.

**Elección.** Migraciones escritas a mano en SQL, ejecutadas por el entrypoint del contenedor antes de que el API escuche (y con fallo ruidoso: si la migración falla, el contenedor muere con código distinto de cero). `synchronize` es inaceptable en un entorno que simula producción: aplica DDL implícito en el arranque, puede destruir datos ante un rename de columna, y hace imposible revisar en un diff qué le va a pasar al esquema. Además los CHECK constraints y los índices con nombre no se expresan bien desde las entidades: el SQL a mano es la fuente de verdad del esquema.

**Trade-off.** Doble mantenimiento: la entidad TypeORM y la migración deben mantenerse coherentes a mano. Aceptado: el esquema es pequeño y el costo de un drift accidental en producción es mucho mayor que el de mantener dos archivos sincronizados.

## La decisión clave: estado persistido y vigencia derivada, por separado

**Contexto.** El enunciado pide dos cosas que parecen la misma pero no lo son: transiciones de estado **manuales** (alguien decide activar o finalizar una promoción) y un contador de promociones **vigentes hoy** (que depende del calendario). Si se modelan como un solo concepto, aparecen inconsistencias inevitables: ¿qué pasa con una promoción ACTIVE cuyo rango de fechas ya venció? ¿Quién la desactiva? ¿En qué zona horaria?

**Alternativas.**

1. Un solo campo `status` que un job programado (cron) actualiza automáticamente según las fechas.
2. Un campo booleano `vigente` persistido, actualizado en cada escritura.
3. `status` persistido y manual + vigencia **derivada** en el momento de la lectura.

**Elección.** La tercera. `status` es lo que un humano decidió (SCHEDULED → ACTIVE → ENDED, transiciones validadas por una máquina de estados explícita, sin saltos ni retrocesos); `isActiveToday` no se guarda nunca: se calcula al leer como `status === ACTIVE && startDate <= hoy <= endDate`, con "hoy" resuelto en `APP_TIMEZONE` en un único helper (`clock.ts`, el único archivo autorizado a llamar `new Date()` para lógica de negocio). Una promoción ACTIVE con fechas vencidas simplemente no cuenta como vigente — sin job, sin race conditions, sin estado desincronizado. Hay tests específicos de ese caso y de los bordes (hoy == inicio, hoy == fin).

La alternativa del job automático se descartó para este alcance de forma deliberada: introduce infraestructura nueva (scheduler), un modo de fallo nuevo (¿qué pasa si el job no corre a medianoche?), dependencia fina de la zona horaria del servidor, y contradice el enunciado, que exige que las transiciones sean manuales. Un dato derivado no puede estar desactualizado; un dato materializado por un job, sí.

**Trade-off.** El cálculo se repite en cada lectura (costo despreciable: una comparación de strings) y "vigente" no es filtrable con un índice directo. Si el listado creciera a millones de filas, se materializaría con una columna generada o una vista — decisión reversible, a diferencia de la inversa.

## Objetivo de la promoción: XOR en una tabla, no dos tablas

**Contexto.** Una promoción aplica a un producto **o** a una categoría, exactamente uno.

**Alternativas.** Dos tablas (`product_promotions`, `category_promotions`); una tabla polimórfica (`target_type` + `target_id` sin FK); una tabla con dos FKs nullable y un CHECK de exclusión mutua.

**Elección.** Dos columnas nullable (`product_id`, `category_id`) con FKs reales y `CHECK (product_id IS NOT NULL) XOR (category_id IS NOT NULL)` expresado explícitamente en la migración. Mantiene integridad referencial genuina en ambas ramas (lo que el polimórfico pierde) y evita duplicar toda la lógica de ciclo de vida, endpoints y UI en dos entidades casi idénticas (el costo de las dos tablas). El API refleja el mismo XOR en el DTO.

**Trade-off.** Una columna siempre viaja en NULL y agregar un tercer tipo de objetivo exige migración (nueva columna + CHECK ampliado). Con dos tipos estables, es el punto medio correcto.

## Fechas como DATE, no TIMESTAMP

**Contexto.** La vigencia de una promoción se define en días de calendario ("del 1 al 30 de septiembre"), no en instantes.

**Alternativas.** `timestamptz` con horas 00:00/23:59; `date`.

**Elección.** `date` en la base, strings `YYYY-MM-DD` en el API y en el código. Un `timestamptz` obliga a decidir horas de corte y reabre el problema de zona horaria en cada comparación; con `date` la pregunta "¿está vigente hoy?" se reduce a comparar tres strings ISO (que ordenan lexicográficamente igual que cronológicamente). La zona horaria se aplica una sola vez: al calcular qué día es "hoy", vía `Intl.DateTimeFormat` con `APP_TIMEZONE` (America/Bogota). Ni el backend ni el frontend construyen objetos `Date` a partir de estas fechas — así se evita el clásico corrimiento de un día al parsear `YYYY-MM-DD` como UTC.

**Trade-off.** No se pueden expresar promociones con hora de inicio ("desde las 18:00"). Fuera de alcance y fácil de añadir después con una columna adicional; lo contrario (deshacer timestamps mal usados) es mucho más caro.

## Validación duplicada: DTO y constraints de BD

**Contexto.** Las mismas reglas (XOR, rango de fechas, porcentaje 1–100, valor positivo) existen en el `ValidationPipe`/class-validator y en los CHECK de PostgreSQL.

**Alternativas.** Validar solo en la aplicación; validar solo en la base; ambas.

**Elección.** Ambas, con papeles distintos. El DTO da errores 400 legibles y por campo, en el borde del sistema, sin gastar un round-trip; la base garantiza que la regla se cumple **siempre**, también para el código futuro que se salte el DTO, un script de soporte o un insert manual. No es duplicación accidental sino defensa en profundidad; para minimizar el drift, los invariantes viven en una función pura única (`promotion-invariants.ts`) que usan tanto el validador del DTO como el servicio en updates parciales (donde valida el resultado de fusionar el payload con la fila almacenada — un payload parcialmente válido puede producir un estado inválido).

**Trade-off.** Cambiar una regla toca dos lugares (función de invariantes + migración). Aceptado y documentado; el CHECK es la red de seguridad, no la fuente de los mensajes de error.

## Secretos y validación de entorno en el pipeline

**Contexto.** El principio del proyecto es "sin secretos en el repo, nunca", y un pipeline que falla por configuración debe decirlo claramente.

**Elección.** Cuatro capas: (1) `.env` está en `.gitignore` y `.env.example` solo trae claves con valores vacíos o placeholders; (2) `docker-compose.yml` usa `${VAR:?mensaje}` para toda variable, así un entorno incompleto aborta en el segundo cero con el nombre de la variable; (3) en CI, las credenciales existen solo como GitHub Secrets y el `.env` se materializa en el runner efímero; (4) el job de smoke ejecuta primero `scripts/check-env.sh`, que lee las claves de `.env.example` (fuente única de verdad) y lista **todas** las variables faltantes antes de intentar levantar nada — el objetivo es que un secret sin configurar produzca `ERROR: missing required environment variable: POSTGRES_PASSWORD` en el primer paso, no un `ECONNREFUSED` cuarenta segundos después. Un job independiente de gitleaks escanea el historial completo por credenciales filtradas.

**Trade-off.** Fricción inicial: el proyecto no arranca sin crear el `.env` y el CI no pasa sin configurar dos secrets. Es fricción deliberada; la alternativa (defaults con credenciales hardcodeadas) convierte el repo en un ejemplo de lo que el propio enunciado prohíbe.

## Qué se dejó fuera deliberadamente

Límites reconocidos, no omisiones. En cada caso el criterio fue el mismo: alcance mínimo con ejecución completa antes que superficie amplia a medias.

- **Autenticación y autorización.** El módulo asume un operador de confianza en red interna. Añadir un JWT decorativo sin gestión de usuarios, roles ni expiración habría sido teatro de seguridad; hacerlo bien es un proyecto en sí mismo. El diseño no lo obstaculiza: un guard de NestJS se acopla al controller sin tocar el dominio.

- **Paginación.** Con decenas de promociones (el caso realista de un POS pequeño) pagina el que quiere aparentar escala. `findAll` devuelve todo y el frontend lo renderiza sin virtualización. Si la tabla creciera, el cambio es local: query params `page`/`limit` en el controller y `take`/`skip` en el repositorio.

- **Solapamiento de promociones.** Nada impide dos promociones ACTIVE sobre el mismo producto en fechas superpuestas. Resolverlo exige decisiones de negocio que el enunciado no da (¿se prohíbe? ¿se acumulan? ¿gana la mayor? ¿y una por producto más otra por su categoría?). Implementar una política inventada sería peor que documentar su ausencia; la restricción técnica (un EXCLUDE constraint con rangos de fechas en PostgreSQL) es conocida y cabría en una migración futura.

- **Auditoría de cambios.** `created_at`/`updated_at` existen, pero no hay historial de quién cambió qué (tabla de eventos o temporal tables). Sin autenticación no hay "quién", así que la auditoría real depende de la primera omisión.

- **Internacionalización.** El español está aislado en una sola capa del frontend (`ui/labels.ts`) que mapea enums y textos; el resto del sistema — código, API, datos de error — habla inglés. Eso deja la puerta abierta a i18n real (extraer esa capa a catálogos por idioma) sin haber pagado hoy el costo de una librería y un flujo de traducción para un requisito inexistente.
