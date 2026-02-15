/**
 * Script para criar issues no Jira a partir de erros_encontrados.md
 * 
 * Este script parseia o documento e cria issues no Jira usando MCP
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const CLOUD_ID = '33d160dc-bf24-48a1-8c7f-f22ba9eb41fc';
const PROJECT_KEY = 'SCRUM';

/**
 * Parse do markdown para extrair erros
 */
function parseErrors(markdown) {
  const errors = [];
  
  // Dividir por categorias (## N. Título)
  const categorySections = markdown.split(/^## \d+\.\s+/gm).filter(s => s.trim());
  
  categorySections.forEach((categorySection, catIndex) => {
    if (catIndex === 0) return; // Pular cabeçalho
    
    const categoryMatch = categorySection.match(/^([^\n]+)/);
    if (!categoryMatch) return;
    
    const categoryTitle = categoryMatch[1].trim();
    const categoryNumber = catIndex;
    
    // Dividir por erros (### N.M. Título)
    const errorSections = categorySection.split(/^### \d+\.\d+\.\s+/gm).filter(s => s.trim());
    
    errorSections.forEach((errorSection, errIndex) => {
      if (errIndex === 0) return; // Pular cabeçalho da categoria
      
      const errorHeaderMatch = errorSection.match(/^([^\n]+)/);
      if (!errorHeaderMatch) return;
      
      const errorTitle = errorHeaderMatch[1].trim();
      const errorNumber = `${categoryNumber}.${errIndex}`;
      
      // Extrair campos
      const locationMatch = errorSection.match(/\*\*Localização:\*\*\s*(.+?)(?:\n|$)/);
      const location = locationMatch ? locationMatch[1].trim() : 'Não especificada';
      
      const problemaMatch = errorSection.match(/\*\*Problema:\*\*\s*(.+?)(?:\*\*|$)/s);
      const problema = problemaMatch ? problemaMatch[1].trim() : '';
      
      const impactoMatch = errorSection.match(/\*\*Impacto:\*\*\s*(.+?)(?:\*\*|$)/);
      const impacto = impactoMatch ? impactoMatch[1].trim() : 'Não especificado';
      
      const solucaoMatch = errorSection.match(/\*\*Solução:\*\*\s*(.+?)(?:\*\*|$|---)/s);
      const solucao = solucaoMatch ? solucaoMatch[1].trim() : '';
      
      const codigoMatch = errorSection.match(/```[\w]*\n([\s\S]*?)```/);
      const codigo = codigoMatch ? codigoMatch[1].trim() : '';
      
      errors.push({
        id: `ERR-${errorNumber}`,
        numero: errorNumber,
        titulo: errorTitle.replace(/^\d+\.\d+\.\s*/, ''),
        categoria: categoryTitle,
        localizacao: location,
        problema,
        impacto,
        solucao,
        codigo
      });
    });
  });
  
  return errors;
}

/**
 * Determina prioridade baseado no impacto
 */
function getPriority(impacto) {
  const impactoLower = impacto.toLowerCase();
  if (impactoLower.includes('crítico')) return 'Highest';
  if (impactoLower.includes('alto')) return 'High';
  if (impactoLower.includes('médio')) return 'Medium';
  return 'Low';
}

/**
 * Determina tipo de issue baseado na categoria
 */
function getIssueType(categoria) {
  const categoriaLower = categoria.toLowerCase();
  if (categoriaLower.includes('segurança') || categoriaLower.includes('lógica') || categoriaLower.includes('execução')) {
    return 'Tarefa'; // Usar "Tarefa" pois não há "Bug" disponível
  }
  return 'Tarefa';
}

/**
 * Formata descrição para Jira
 */
function formatDescription(error) {
  let desc = `*Categoria:* ${error.categoria}\n\n`;
  
  if (error.localizacao && error.localizacao !== 'Não especificada') {
    desc += `*Localização:* ${error.localizacao}\n\n`;
  }
  
  if (error.problema) {
    desc += `h3. Problema\n\n${error.problema}\n\n`;
  }
  
  if (error.impacto) {
    desc += `h3. Impacto\n\n${error.impacto}\n\n`;
  }
  
  if (error.codigo) {
    desc += `h3. Código Afetado\n\n{code:javascript}\n${error.codigo}\n{code}\n\n`;
  }
  
  if (error.solucao) {
    desc += `h3. Solução Proposta\n\n${error.solucao}\n\n`;
  }
  
  desc += `----\n\n*ID do Erro:* ${error.id}\n`;
  desc += `*Número:* ${error.numero}\n`;
  
  return desc;
}

// Ler arquivo
const errorsFilePath = path.join(__dirname, '../docs/erros_encontrados.md');
let markdown;
let errors;
try {
  markdown = fs.readFileSync(errorsFilePath, 'utf-8');
  errors = parseErrors(markdown);
} catch (error) {
  console.error(`❌ Failed to read or parse errors file at ${errorsFilePath}: ${error.message}`);
  process.exit(1);
}

console.log(`📋 Encontrados ${errors.length} erros para criar no Jira\n`);

// Exportar para uso com MCP
const exportData = {
  cloudId: CLOUD_ID,
  projectKey: PROJECT_KEY,
  errors: errors.map(error => ({
    summary: `[${error.id}] ${error.titulo}`,
    description: formatDescription(error),
    issueType: getIssueType(error.categoria),
    priority: getPriority(error.impacto),
    metadata: {
      categoria: error.categoria,
      localizacao: error.localizacao,
      numero: error.numero,
      id: error.id
    }
  }))
};

console.log('✅ Dados preparados. Use as ferramentas MCP para criar as issues.');
console.log(`\nExemplo de comando para criar issue:`);
if (exportData.errors.length > 0) {
  const example = exportData.errors[0];
  console.log(JSON.stringify({
    cloudId: example.cloudId || CLOUD_ID,
    projectKey: PROJECT_KEY,
    issueTypeName: example.issueType,
    summary: example.summary,
    description: example.description.substring(0, 500) + '...'
  }, null, 2));
}

export default exportData;
