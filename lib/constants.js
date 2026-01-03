export const PERIODOS_AVALIATIVOS = [
  '1º Bimestre',
  '2º Bimestre',
  '3º Bimestre',
  '4º Bimestre',
  '1º Trimestre',
  '2º Trimestre',
  '3º Trimestre',
  '1º Semestre',
  '2º Semestre'
];

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@corregia.com';

// Tipos de gabarito
export const TIPO_GABARITO = {
  MULTIPLA_ESCOLHA: 'multipla_escolha',
  DISSERTATIVA: 'dissertativa',
  MISTA: 'mista'
};

// Habilidades padrão (podem ser customizadas pelo usuário)
export const HABILIDADES_PADRAO = [
  'Interpretação de Texto',
  'Cálculo',
  'Geometria',
  'Álgebra',
  'Gramática',
  'Vocabulário',
  'Compreensão',
  'Análise',
  'Síntese',
  'Aplicação',
  'Raciocínio Lógico',
  'Resolução de Problemas'
];

// Limites do modelo Freemium
export const PLANO_LIMITES = {
  free: {
    nome: 'Gratuito',
    provasPorMes: 20,
    correcaoIlimitada: false,
    analyticsAvancado: false,
    assistenteDiscursivo: false
  },
  premium: {
    nome: 'Premium',
    provasPorMes: -1, // Ilimitado
    correcaoIlimitada: true,
    analyticsAvancado: true,
    assistenteDiscursivo: true
  }
};
