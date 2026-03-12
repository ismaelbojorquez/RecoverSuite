## Bulk Imports - Decision Engine

### Decisiones por fila
- **Cliente**: se exige `client.numero_cliente` (número de cliente del layout). Si no existe, se requiere `client.nombre_completo` para crearlo.
- **Crédito**: clave natural `(numero_credito + portfolio_id)`.
  - `ONLY_NEW`: si ya existe → `SKIP_CREDIT` (y `SKIP_SALDOS`).
  - `ONLY_UPDATE`: si no existe → `SKIP_CREDIT`.
  - `UPSERT`: existe → `UPDATE_CREDIT`, no existe → `INSERT_CREDIT`.
- **Saldos**: si la acción de crédito es `SKIP_CREDIT` → `SKIP_SALDOS`; de lo contrario `UPSERT_SALDOS`.
- **Normalización**:
  - Números: se quitan comas, moneda, espacios y paréntesis para negativos.
  - Strings: `trimStrings` configurable (default on).
  - Saldos vacíos: `emptySaldoBehavior` = `null` (default) o `zero`.
  - Fechas: se aceptan formatos estándar ISO; validación adicional puede extenderse usando `dateFormats` en la sesión.

### Configuración de sesión
Opcionalmente `import_config` (o `file_meta.importConfig`) puede incluir:
- `emptySaldoBehavior`: `'null'` | `'zero'`.
- `trimStrings`: boolean.
- `dateFormats`: lista de formatos aceptados (no estrictamente aplicada aún).

### Flujo de ejecución
1. Se construye el record normalizado por fila a partir del mapping.
2. El Decision Engine (`decision-engine.js`) decide las acciones de cliente/crédito/saldos y aplica normalización.
3. El worker ejecuta en streaming:
   - Cliente: `INSERT_CLIENT` o `UPDATE_CLIENT` (o skip).
   - Crédito: `INSERT_CREDIT`/`UPDATE_CREDIT`/skip conforme a la estrategia y existencia previa.
   - Saldos: `UPSERT_SALDOS` o skip; balance fields se upsert si fueron mapeados.
   - Se procesa en chunks (batchSize env.bulkImport.batchSize, default 1000) con consultas precargadas de créditos existentes por chunk y logs de rendimiento.
 4. Progreso y contadores se actualizan vía `jobs` y la sesión.

### Índices recomendados
- `credits (portafolio_id, lower(numero_credito))` (idx_credits_portafolio_numero_lower).
- `credit_saldos (credit_id, saldo_field_id)` para upserts de saldos.

## Permisos
- `BULK_IMPORT_VIEW`: consultar targets, preview, estado de sesión y descargar errores.
- `BULK_IMPORT_CREATE`: crear sesión, subir archivo, guardar mapping, validar.
- `BULK_IMPORT_RUN`: ejecutar importaciones.
- `BULK_IMPORT_CANCEL`: reservado para futura cancelación de jobs.

## Auditoría
Eventos registrados (audit_logs) con usuario, ip, permisos/grupos:
- Creación de sesión.
- Upload de archivo.
- Guardado de mapping.
- Validación.
- Ejecución.
- Descarga de errores (vía logs estructurados si no aplica audit).
