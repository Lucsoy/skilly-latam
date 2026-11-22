# Base de datos de Skilly LATAM — scripts y orden de ejecución

Esquema **2026.11-E3.1**: 30 tablas, 207 columnas, 36 claves foráneas, 20 restricciones CHECK y 86 índices (contando primarias y únicas). La documentación completa está en `docs/02_base_datos/`.

## Opción A — instalación normal (recomendada)

Importa **un solo archivo** en phpMyAdmin (*Importar*) o desde la consola:

```bash
mysql -u root --default-character-set=utf8mb4 < database/skilly.sql
```

En Windows, usa phpMyAdmin o el símbolo del sistema (`cmd`), **no** una tubería de PowerShell: PowerShell 5 vuelve a codificar el texto y las tildes quedan dañadas ("DesempeÃ±o").

```bat
cmd /c "C:\xampp\mysql\bin\mysql.exe -u root --default-character-set=utf8mb4 < database\skilly.sql"
```

`skilly.sql` es **idempotente**: crea la base `skilly_db` si no existe, usa `CREATE TABLE IF NOT EXISTS` y no borra datos. Puedes importarlo más de una vez (verificado en el caso CP-BD-01).

## Opción B — modelo físico por partes (para revisión académica)

Los mismos objetos de `skilly.sql`, separados por responsabilidad en `database/scripts/`. **Ejecútalos en este orden** sobre una base vacía:

| Paso | Archivo | Contenido | Depende de |
|---|---|---|---|
| 1 | `00_crear_base.sql` | `CREATE DATABASE skilly_db` (utf8mb4) | — |
| 2 | `01_crear_tablas.sql` | 30 tablas: solo columnas, tipos, nulos y valores por defecto | 00 |
| 3 | `02_claves_primarias.sql` | `ADD CONSTRAINT pk_* PRIMARY KEY` y `AUTO_INCREMENT` | 01 |
| 4 | `03_claves_foraneas.sql` | 36 `ADD CONSTRAINT fk_* FOREIGN KEY` con su política `ON DELETE` | 02 |
| 5 | `04_indices_restricciones.sql` | Índices compuestos, `UNIQUE` y `CHECK` | 03 |
| 6 | `05_datos_iniciales.sql` | Configuración, tramos de cancelación, categorías y cuenta fundadora | 04 |

```bash
for f in database/scripts/0*.sql; do mysql -u root --default-character-set=utf8mb4 < "$f"; done
```

En Windows (PowerShell), desde la carpeta del proyecto:

```powershell
Get-ChildItem database\scripts\0*.sql | Sort-Object Name | ForEach-Object { cmd /c "C:\xampp\mysql\bin\mysql.exe -u root --default-character-set=utf8mb4 < `"$($_.FullName)`"" }
```

(La redirección `<` la hace `cmd`, que entrega el archivo tal cual; así se conservan las tildes.)

El resultado es **idéntico** a importar `skilly.sql`: `database/verificar/comparar_esquemas.py` informa 0 diferencias (caso CP-BD-02).

> El paso 4 crea automáticamente un índice simple para cada FK. Si después el paso 5 crea un índice compuesto que comienza con la misma columna, el índice simple queda redundante. No afecta el funcionamiento; en una instalación con la opción A no ocurre.

## Scripts destructivos (¡cuidado!)

| Archivo | Efecto | Cuándo usarlo |
|---|---|---|
| `scripts/90_eliminar_claves_foraneas.sql` | Elimina **todas** las FK (los datos quedan sin integridad referencial) | Antes de rehacer el modelo en una base de **prueba** |
| `scripts/91_eliminar_tablas.sql` | **Borra todas las tablas y sus datos** | Para reinstalar desde cero en una base de **prueba** |

Ambos tienen una advertencia en la cabecera y **no forman parte de la instalación**. Antes de ejecutarlos, exporta un respaldo: phpMyAdmin → `skilly_db` → *Exportar* → *Rápido* → SQL. El orden para desmontar es 90 y luego 91. El 91 también funciona solo, porque desactiva temporalmente `FOREIGN_KEY_CHECKS`.

## Migraciones (bases existentes)

Si `skilly_db` ya tenía datos de una versión anterior, **no la borres**: aplica las migraciones en orden, una sola vez cada una.

1. `migracion_cierre_2026_11.sql`: solo si la base es anterior a noviembre de 2026.
2. `migracion_entrega3_2026_11.sql`: cambios de la Entrega 3 (esquema 2026.11-E3):
   - claves foráneas con nombre y `RESTRICT` sobre el historial;
   - columna `rut_normalizado`;
   - columna `secuencia` del historial;
   - `CHECK`, `UNIQUE` e índices compuestos.
3. `migracion_correcciones_2026_11.sql`: correcciones de la revisión final (esquema 2026.11-E3.1):
   - tabla `contadores_reserva`, inicializada con el mayor código ya usado en cada año;
   - historial, chat y evaluaciones con `ON DELETE RESTRICT` hacia `reservas`;
   - estado de pago `sin_cobro` (y conversión de las cancelaciones anteriores al pago que habían quedado como `reembolsado`);
   - `rut_normalizado` que también quita espacios (revisa primero la consulta de diagnóstico de su cabecera);
   - tildes y eñes en categorías, subcategorías y tramos.

Antes de ejecutar:

1. **Respalda** la base.
2. Revisa las consultas de diagnóstico del paso 0 de cada migración (deben dar 0 filas).

La migración solo elimina registros que ya eran inválidos (favoritos de organizaciones inexistentes, bloques duplicados sin retención, filas repetidas de modalidad, insignia o tramo). La migración 2 se probó sobre una base antigua con 300 reservas, 900 eventos de historial y 300 evaluaciones: todos se conservaron, y el esquema resultante es idéntico al de `skilly.sql` (CP-BD-03). La migración 3 se probó sobre una base 2026.11-E3 con una reserva cancelada antes del pago: el contador quedó en el código existente, la reserva pasó a `sin_cobro`, el historial se conservó y el esquema resultante es idéntico al de `skilly.sql` (`evidencias/correcciones_2026-11-17/bd_scripts_y_migracion.log`). Ambas son re-ejecutables.

## Verificación

| Archivo | Qué comprueba |
|---|---|
| `verificar/comparar_esquemas.py` | Compara dos esquemas: columnas, PK, FK (incluida la columna destino y las reglas `ON DELETE/UPDATE`), CHECK, únicos e índices. Por defecto es estricto (también informa índices que sobran); con `--permitir-indices-extra` solo informa lo que falta. Uso: `python3 database/verificar/comparar_esquemas.py skilly_db otra_base` |
| `verificar/pruebas_integridad.sql` | 10 operaciones inválidas que la base debe rechazar (CP-BD-05 a CP-BD-14: CHECK, UNIQUE, FK y borrado de una contratación). Todo ocurre dentro de una transacción que se revierte. Requiere la semilla de rendimiento. |
| `verificar/verificar_scripts.sh` | **Borra y recrea `skilly_db`** (solo en un equipo de pruebas): importa `skilly.sql` dos veces, compara con los scripts 00-05, ejecuta dos veces la migración 3 y, si se le indica la carpeta del esquema anterior, migra una base 2026.11-E3 y la compara. |
| `verificar/generar_diagramas.py` | Regenera el modelo lógico, el DER físico y las tres vistas por módulo desde `information_schema`. |
| `verificar/generar_diccionario.py` | Regenera `DICCIONARIO_DATOS.md` y `Diccionario_de_Datos.xlsx` desde `information_schema`. |

Requisitos: MySQL 8 o MariaDB 10.4+ (la de XAMPP 8.x). Verificado en MariaDB 10.11. MariaDB 10.4 soporta todas las características usadas: columnas generadas `STORED`, `CHECK` e `IF [NOT] EXISTS` en `ALTER TABLE`, pero conviene confirmarlo en el equipo (caso CP-MAN-01).
