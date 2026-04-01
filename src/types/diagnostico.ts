export interface Dimension   { nombre: string; madurez: number; dolor: number; nota: string; }
export interface Accion      { accion: string; horizonte: string; impacto: string; }
export interface Categoria   { categoria: string; icono: string; aplica: boolean; prioridad: string; descripcion: string; acciones: Accion[]; herramientas_sugeridas: string[]; resultado_esperado: string; }
export interface Cronograma  { horizonte: string; etiqueta: string; color: string; hitos: string[]; }
export interface KpiExito    { metrica: string; estado_actual: string; meta: string; }
export interface PlanAccionT { resumen_estrategico: string; categorias: Categoria[]; cronograma: Cronograma[]; kpis_de_exito: KpiExito[]; advertencias: string[]; }
export interface MsgItem     { titulo: string; descripcion: string; mensaje: string; }
export interface VozItem     { titulo: string; duracion: string; descripcion: string; guion: string; }
export interface NotaCRM     { resumen_ejecutivo: string; dolor_principal: string; etapa_critica: string; gestion_actual: string; nivel_desorden: string; urgencia: string; plan_sugerido: string; causas_probables: string; notas_asesor: string; }



export interface Oportunidad {
  tipo: 'sistema' | 'integracion' | 'automatizacion' | 'agente_ia' | 'proceso' | 'dashboard';
  nombre: string;
  dolor_que_resuelve: string;
  que_hace: string;
  herramienta_sugerida: string;
  por_que_esta_herramienta: string;
  requiere_antes: string;
  viable_hoy: boolean;
}

export interface IdeaValidada {
  idea_original: string;
  evaluacion: 'viable' | 'viable con ajustes' | 'no viable aún' | 'no recomendada';
  razon: string;
  ajuste_sugerido: string;
}

export interface DiagnosticoResult {
  empresa: string; sector: string; contacto: string; cargo: string;
  objetivo_declarado: string; objetivo_subyacente: string;
  diagnostico_principal: { codigo: string; nombre: string; lectura: string };
  diagnostico_secundario: { codigo: string; nombre: string; lectura: string };
  estado_actual: string | {
    resumen: string;
    procesos_definidos: boolean;
    sistemas_activos: boolean;
    automatizaciones: boolean;
    uso_ia: boolean;
    herramientas_actuales: { herramienta: string; uso_real: string; aprovechamieno: string }[];
    nivel_madurez_digital: string;
  };
  dolores_prioritarios: { dolor: string; impacto: string; solucionable_con_tech?: boolean }[];
  causas_raiz: { causa: string; evidencia: string; confianza: string }[];
  dimensiones: Dimension[];
  score: Record<string, number>;
  fit_sixteam: string;
  ruta_solucion: string;
  quick_wins: string[];
  recomendacion: string;
  razon_recomendacion: string;
  siguiente_paso: string;
  plan_accion?: PlanAccionT;
  oportunidades?: Oportunidad[];
  ideas_del_cliente_validadas?: IdeaValidada[];
  mensajes_whatsapp: Record<string, MsgItem>;
  notas_de_voz: Record<string, VozItem>;
  nota_crm: NotaCRM;
  canvas_pdf?: string;
  recursos_necesarios?: {
    personas: string[];
    plataformas: string[];
    procesos_a_definir: string[];
    ia_recomendada: string[];
    tiempo_estimado: string;
  };
}

export interface UsageStats {
  p1_input: number; p1_output: number;
  p2_input: number; p2_output: number;
  costo: number;
}
