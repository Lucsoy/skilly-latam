# Guía de estilos de Skilly LATAM

Esta guía documenta el sistema visual **que usa el código** (`tailwind.config.js`, `src/index.css` y `src/components/ui/`). No es una propuesta aparte: cualquier pantalla nueva debe construirse con estos tokens y componentes.

## 1. Principios

1. **Cercanía profesional:** tono en segunda persona ("tú"), frases cortas, sin tecnicismos. Por ejemplo: "Tu solicitud fue enviada a administración".
2. **Una acción principal por pantalla:** botón primario visible. Las acciones destructivas (cancelar, rechazar) usan el botón de peligro y piden confirmación en un diálogo.
3. **Estado siempre visible:** cada contratación muestra su estado con una insignia, una descripción en lenguaje simple y su historial.
4. **Nada se pierde sin aviso:** antes de cancelar se muestra el monto retenido; el pago se identifica explícitamente como **simulado**.

## 2. Color

| Token (Tailwind) | Hex | Uso |
|---|---|---|
| `primario-400` | `#9CB4FF` | Fondo del botón primario |
| `primario-700` | `#5A6EB5` | Enlaces, selección (día/hora elegidos), burbujas propias del chat |
| `primario-800` | `#47598F` | Texto de opción seleccionada sobre `primario-50` |
| `primario-50` | `#F4F6FF` | Fondo de opción seleccionada, avisos informativos |
| `amarillo-300` | `#FFCC33` | Botón secundario |
| `lila-300` / `lila-700` | `#CC99FF` / `#7E42AA` | Bordes de controles / botón fantasma |
| `crema` | `#E9E9E9` | Fondo general y bloques de historial |
| `superficie` | `#FFFFFF` | Tarjetas, diálogos, campos |
| `tinta` / `tinta-suave` / `tinta-tenue` | `#1A1A1A` / `#333333` / `#666666` | Texto principal / secundario / auxiliar |
| `exito-50/700` | `#EAFBF5` / `#117653` | Confirmaciones |
| `aviso-50/700` | `#FFF9E5` / `#7A5900` | Advertencias (cambio de fecha pendiente, pago simulado) |
| `peligro-50/600/700` | `#FDF0EE` / `#B93A2C` / `#962E23` | Errores y acciones destructivas |

### Contraste verificado (WCAG 2.1 AA, mínimo 4,5:1 para texto normal)

| Combinación | Contraste | Nivel |
|---|---|---|
| Botón primario: carbón sobre primario-400 | 8,61:1 | AA |
| Botón secundario: carbón sobre amarillo-300 | 11,55:1 | AA |
| Botón de peligro: blanco sobre peligro-600 | 5,67:1 | AA |
| Botón fantasma: lila-700 sobre blanco | 6,47:1 | AA |
| Selección: blanco sobre primario-700 | 4,85:1 | AA |
| Opción elegida: primario-800 sobre primario-50 | 6,29:1 | AA |
| Enlaces: primario-700 sobre blanco | 4,85:1 | AA |
| Texto sobre crema / texto tenue sobre crema | 14,34:1 / 4,73:1 | AA |
| Éxito, peligro y aviso (texto 700 sobre fondo 50) | 5,24 / 6,96 / 6,12:1 | AA |

> **Corrección de esta entrega (INC-19):** antes se usaba blanco sobre `primario-600` (`#6F86D6`), con un contraste de **3,47:1**, que no cumple. Afectaba al botón *Crear cuenta* del encabezado, las burbujas del chat, el día seleccionado del calendario y la hora elegida. Se reemplazó por `primario-700`.

## 3. Tipografía

- **Familia:** *Space Mono* (Google Fonts), con respaldo `system-ui`, `Segoe UI`, `Roboto` y `Arial`. Los números usan `tabular-nums` en montos y horas.
- **Escala:**
  - Título de página: `text-2xl font-semibold tracking-tight`.
  - Sección: `text-lg font-semibold` / `text-sm font-semibold`.
  - Cuerpo: `text-sm`.
  - Auxiliar: `text-xs text-tinta-tenue`.
  - Códigos de contratación: `font-mono text-xs`.
- **Ajustes:** `text-wrap: balance` en los títulos y `pretty` en los párrafos (evitan líneas huérfanas).

## 4. Espaciado, forma y elevación

- Escala de 4 px de Tailwind. Las tarjetas usan `p-5 sm:p-6` y los bloques se separan con `gap-6`.
- Radios: `rounded-xl` (14 px) en controles y `rounded-2xl` (18 px) en tarjetas y diálogos.
- Sombra `shadow-suave` en tarjetas. El diálogo oscurece el fondo con `backdrop:bg-tinta/40`.
- Ancho de lectura: `max-w-3xl` en detalles y formularios, y `max-w-6xl` en el contenedor general.

## 5. Componentes (`src/components/ui`)

| Componente | Variantes / reglas |
|---|---|
| `Boton`, `BotonEnlace` | `primario`, `secundario`, `fantasma`, `peligro` · tamaños `sm` (36 px), `md` (44 px) y `lg` (48 px) de alto mínimo · `cargando` muestra un indicador y deshabilita · ícono opcional (lucide) |
| `CampoTexto`, `CampoTextarea`, `CampoSelect`, `CampoCheckbox` | Etiqueta siempre visible, `ayuda`, `nota` ("Opcional"), mensaje de `error` asociado con `aria-describedby`, contador `maximo` · `CampoSelect` es una lista accesible (`listbox`) con teclado (↑ ↓ Enter Esc) |
| `Dialogo` | Basado en `<dialog>` nativo: foco atrapado, cierre con Escape y clic en el fondo, `aria-labelledby` · confirmación obligatoria para acciones irreversibles |
| `Alerta` | `info`, `exito`, `aviso`, `peligro`, con título opcional |
| `Insignia` | Estado de la contratación o de la validación (mismo tono para el mismo estado en todo el sistema) |
| `Tarjeta` | Contenedor estándar |
| `Esqueleto`, `Cargando` | Estado de carga (nunca una pantalla en blanco) |
| `EstadoVacio`, `EstadoError` | Estado vacío con explicación y estado de error con **Reintentar** |
| `Pestanas` | Filtros con contador (por ejemplo, "Por responder 2") |

## 6. Estados de interfaz obligatorios

| Estado | Patrón | Ejemplo |
|---|---|---|
| Carga | `Esqueleto` con la forma del contenido | Detalle de reserva |
| Vacío | `EstadoVacio` con qué hacer a continuación | "Cuando administración derive un trabajo para ti aparecerá aquí." |
| Error | `EstadoError` + Reintentar; `Alerta peligro` en acciones | "No se pudo conectar con el servidor…" |
| Éxito | `Alerta exito` breve tras la acción | "Aceptaste la nueva fecha." |
| Validación | Mensaje bajo el campo, en el momento de enviar | "El RUT no es válido. Revisa el dígito verificador." |

## 7. Accesibilidad e interacción

- **Foco visible** global: `:focus-visible` con anillo `primario-500` (`src/index.css`). Las opciones con radio oculto (`sr-only`) muestran el anillo con `focus-within`.
- Enlace "Ir al contenido" al inicio de cada página.
- Objetivos táctiles de al menos 44 × 44 px (`min-h-[44px]`).
- Calendario con `role="grid"`, `aria-pressed` y `aria-label` descriptivo ("lunes 18, con horas disponibles").
- No se transmite información solo con color: las insignias llevan texto.

## 8. Diseño responsivo

Diseño *mobile first* con los puntos de quiebre de Tailwind:

- `sm` 640 px: formularios en dos columnas.
- `lg` 1024 px: menú lateral del profesional y paneles de resumen fijos.

Verificado sin desplazamiento horizontal en **390, 768 y 1440 px** (pruebas RESP-*). Las decoraciones ambientales de la pantalla de ingreso se ocultan bajo 1024 px (INC-18).

## 9. Redacción

- Español de Chile neutro, tuteo y verbos de acción en los botones ("Enviar solicitud a Skilly", "Marcar como entregado").
- Los mensajes de error explican qué pasó y qué hacer, sin códigos técnicos.
- Montos con `formatearCLP` ($280.000) y fechas con `formatearRangoBloque` ("miércoles 18 de noviembre, 10:00–11:00").
