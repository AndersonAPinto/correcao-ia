import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Valida arquivo de upload
 * @param {File} file - Arquivo a ser validado
 * @param {Object} options - Opções de validação
 * @param {number} options.maxSizeMB - Tamanho máximo em MB (padrão: 10MB)
 * @param {string[]} options.allowedTypes - Tipos MIME permitidos (padrão: imagens)
 * @returns {{ valid: boolean, error?: string }}
 */
// Magic bytes signatures para cada tipo permitido.
// Validar o conteúdo real do arquivo em vez de confiar apenas no MIME/extensão do cliente.
const MAGIC_BYTES = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/jpg':  [[0xFF, 0xD8, 0xFF]],
  'image/png':  [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (validação adicional de offset 8 seria ideal)
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

function checkMagicBytes(buffer, mimeType) {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return false;
  return signatures.some(sig =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}

export async function validateFileUpload(file, options = {}) {
  const {
    maxSizeMB = 10,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
  } = options;

  if (!file) {
    return { valid: false, error: 'Arquivo não fornecido' };
  }

  // Validar tamanho
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'Arquivo vazio' };
  }

  // Validar tipo MIME declarado pelo cliente
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Tipos permitidos: ${allowedTypes.join(', ')}`
    };
  }

  // Validar extensão do nome do arquivo
  const fileName = file.name.toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Extensão de arquivo não permitida'
    };
  }

  // Validar magic bytes — verifica o conteúdo real, independente do MIME/extensão declarados
  const headerBytes = await file.slice(0, 8).arrayBuffer();
  const buffer = new Uint8Array(headerBytes);
  if (!checkMagicBytes(buffer, file.type)) {
    return {
      valid: false,
      error: 'Conteúdo do arquivo não corresponde ao tipo declarado'
    };
  }

  return { valid: true };
}

/**
 * Gera um nome de arquivo seguro descartando o nome original do cliente.
 * Deriva a extensão do MIME type em vez de confiar no nome do arquivo.
 */
export function safeFilename(uuid, mimeType) {
  const ext = {
    'image/jpeg': '.jpg',
    'image/jpg':  '.jpg',
    'image/png':  '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  }[mimeType] || '.bin';
  return `${uuid}${ext}`;
}

/**
 * Valida número de nota (0-10) com whitelist rigorosa
 * @param {any} value - Valor a ser validado
 * @param {Object} options - Opções de validação
 * @param {number} options.min - Valor mínimo (padrão: 0)
 * @param {number} options.max - Valor máximo (padrão: 10)
 * @returns {{ valid: boolean, value?: number, error?: string }}
 */
export function validateNota(value, options = {}) {
  const { min = 0, max = 10 } = options;

  // Rejeitar valores não numéricos
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'Valor não fornecido' };
  }

  // Converter para número
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);

  // Validar se é número válido (não NaN, não Infinity)
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, error: 'Valor numérico inválido' };
  }

  // Validar range
  if (num < min || num > max) {
    return { valid: false, error: `Valor deve estar entre ${min} e ${max}` };
  }

  // Arredondar para 2 casas decimais (prevenir precisão excessiva)
  const rounded = Math.round(num * 100) / 100;

  return { valid: true, value: rounded };
}

/**
 * Valida formato UUID v4
 * @param {string} id - ID a ser validado
 * @returns {boolean}
 */
export function isValidUUID(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Sanitiza string removendo caracteres perigosos (whitelist approach)
 * @param {string} str - String a ser sanitizada
 * @param {Object} options - Opções de sanitização
 * @param {number} options.maxLength - Tamanho máximo (padrão: 10000)
 * @param {boolean} options.allowNewlines - Permitir quebras de linha (padrão: true)
 * @returns {string} - String sanitizada
 */
export function sanitizeString(str, options = {}) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  const { maxLength = 10000, allowNewlines = true } = options;

  // Limitar tamanho
  let sanitized = str.slice(0, maxLength);

  // Remover caracteres de controle (exceto \n, \r, \t se permitidos)
  if (allowNewlines) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  }

  // Remover tags HTML/scripts (proteção básica)
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  return sanitized.trim();
}

/**
 * Valida e sanitiza nome (whitelist de caracteres permitidos)
 * @param {string} nome - Nome a ser validado
 * @param {Object} options - Opções
 * @param {number} options.minLength - Tamanho mínimo (padrão: 1)
 * @param {number} options.maxLength - Tamanho máximo (padrão: 200)
 * @returns {{ valid: boolean, value?: string, error?: string }}
 */
export function validateNome(nome, options = {}) {
  const { minLength = 1, maxLength = 200 } = options;

  if (!nome || typeof nome !== 'string') {
    return { valid: false, error: 'Nome não fornecido' };
  }

  const trimmed = nome.trim();

  if (trimmed.length < minLength) {
    return { valid: false, error: `Nome deve ter pelo menos ${minLength} caracteres` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Nome deve ter no máximo ${maxLength} caracteres` };
  }

  // Whitelist: letras, números, espaços, acentos, hífen, underscore
  const allowedPattern = /^[a-zA-ZÀ-ÿ0-9\s\-_]+$/;
  if (!allowedPattern.test(trimmed)) {
    return { valid: false, error: 'Nome contém caracteres não permitidos' };
  }

  return { valid: true, value: trimmed };
}
