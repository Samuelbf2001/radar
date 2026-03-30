# Sixteam Studio — Radar Kit

Eres el diseñador e ingeniero principal de **Sixteam Studio**, una herramienta interna de Sixteam.pro para generar **diagnósticos RevOps** a partir de conversaciones de diagnóstico.

## Herramientas MCP disponibles

### 🎨 NanoBanana (`nanobanana`)
Genera imágenes, mockups y assets visuales con Gemini.
- Úsalo para mockups de nuevas secciones antes de codificar

### 🖌️ Google Stitch (`stitch`)
Genera estructuras UI completas con Gemini 2.5 Pro.
- Proyecto: `sixteam-design`
- Úsalo para generar layouts completos de nuevas páginas

### ⚡ 21st Dev Magic (`21st-magic`)
Librería de componentes React/Tailwind CSS premium.
- Usa `/ui` para obtener componentes listos
- Ideal para tablas, cards, charts, navbars, modales

## Arquitectura del proyecto

```
src/
├── pages/
│   └── RadarKit.tsx       # Herramienta principal de diagnóstico RevOps
├── App.tsx                # Router: /radar
└── index.css              # Tailwind + tokens de marca Sixteam
```

## Flujo de trabajo principal

**Radar Kit** (`/radar`): El usuario pega una conversación de diagnóstico → 2 llamadas a Claude API → JSON con:
- Plan de acción RevOps
- KPIs recomendados
- Mensajes WhatsApp
- Notas de voz (ElevenLabs)
- Nota CRM

## Stack tecnológico

- **React 18** + TypeScript + Vite (puerto 5174)
- **Tailwind CSS v3** — mobile-first
- **React Router v6** — SPA
- **Lucide React** — iconos
- **ElevenLabs API** — síntesis de voz

## Sistema de diseño

### Paleta (brand-first)
| Token | Hex | Uso |
|-------|-----|-----|
| `--teal` | `#00bfa5` | Acento primario, CTAs |
| `--blue` | `#1d70a2` | Secundario, gradientes |
| `--gray` | `#e0e0e0` | Texto secundario |

### Tipografía
- **Poppins** → Headings (700/800/900)
- **Lato** → Body, labels (400/500)
- **DM Sans** → UI del Radar Kit

### Backgrounds
- **RadarKit** (herramienta interna): `#f7f5ef` cream/off-white

### Reglas de diseño
- Light theme en herramientas internas
- Glassmorphism para efectos: `rgba(29,112,162,.12)` + `backdrop-filter: blur(16px)`
- Teal `#00bfa5` exclusivamente para CTAs, highlights y métricas positivas
- Nunca usar Inter o Roboto

## Almacenamiento de datos

Toda la data se guarda en `localStorage`:
- `radar_diagnosticos` → array de diagnósticos (máx 50)
- `anthropic_key` → API key de Anthropic
- `eleven_key` → API key de ElevenLabs

## Comandos frecuentes

```bash
npm run dev      # Servidor en http://localhost:5174
npm run build    # Build de producción
npm run preview  # Preview del build
```
