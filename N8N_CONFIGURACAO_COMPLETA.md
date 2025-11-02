# 🔄 Configuração Completa do N8N - Corretor 80/20

## 📋 Visão Geral do Fluxo

```
Frontend → Backend → N8N → Gemini AI → N8N → Backend → Frontend
   (1)       (2)      (3)      (4)       (5)     (6)      (7)
```

1. **Frontend**: Usuário faz upload da prova
2. **Backend**: Salva imagem, debita créditos, chama N8N
3. **N8N**: Recebe webhook, baixa imagem
4. **Gemini AI**: Processa OCR + correção
5. **N8N**: Formata resposta
6. **Backend**: Recebe resultado via `/api/webhook/result`
7. **Frontend**: Atualiza automaticamente (polling 10s)

---

## 🛠️ Configuração do Workflow N8N

### 1️⃣ **Nó 1: Webhook (Start)**

**Configuração:**
- Tipo: `Webhook`
- HTTP Method: `POST`
- Path: `/webhook/corrigir-prova` (ou qualquer path único)
- Response Mode: `Immediately` (responde logo)

**Payload Recebido:**
```json
{
  "user_id": "uuid-do-usuario",
  "assessment_id": "uuid-da-avaliacao",
  "image_url": "https://correct80-20.preview.emergentagent.com/uploads/arquivo.jpg",
  "gabarito_id": "uuid-do-gabarito",
  "gabarito_content": "Respostas corretas esperadas...",
  "perfil_avaliacao": "Critérios de correção...",
  "turma_nome": "3º Ano A",
  "aluno_nome": "João Silva",
  "periodo": "1º Bimestre"
}
```

---

### 2️⃣ **Nó 2: HTTP Request - Download Imagem**

**Configuração:**
- Method: `GET`
- URL: `{{ $json.image_url }}`
- Response Format: `File`
- Output: Binary Data

**O que faz:** Baixa a imagem da prova do servidor

---

### 3️⃣ **Nó 3: Gemini API - OCR + Correção**

**Configuração:**
- Method: `POST`
- URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=SUA_API_KEY`
- Headers:
  - `Content-Type: application/json`

**Body JSON:**
```json
{
  "contents": [{
    "parts": [
      {
        "inline_data": {
          "mime_type": "{{ $binary.data.mimeType }}",
          "data": "{{ $binary.data.data }}"
        }
      },
      {
        "text": "Você é um corretor de provas profissional.\n\n**GABARITO OFICIAL:**\n{{ $('Webhook').item.json.gabarito_content }}\n\n**PERFIL DE AVALIAÇÃO:**\n{{ $('Webhook').item.json.perfil_avaliacao }}\n\n**INSTRUÇÕES:**\n1. Analise a imagem e transcreva o texto manuscrito (OCR)\n2. Compare as respostas com o gabarito oficial\n3. Avalie cada exercício individualmente\n4. Atribua notas de 0 a 10\n5. Forneça feedback construtivo\n\n**RETORNE APENAS JSON VÁLIDO:**\n{\n  \"texto_ocr\": \"Texto completo transcrito da prova\",\n  \"nota_final\": 8.5,\n  \"feedback_geral\": \"Feedback geral sobre o desempenho\",\n  \"exercicios\": [\n    {\n      \"numero\": 1,\n      \"nota\": 2.8,\n      \"nota_maxima\": 3.0,\n      \"feedback\": \"Feedback específico do exercício 1\"\n    },\n    {\n      \"numero\": 2,\n      \"nota\": 2.5,\n      \"nota_maxima\": 3.0,\n      \"feedback\": \"Feedback específico do exercício 2\"\n    }\n  ]\n}"
      }
    ]
  }]
}
```

---

### 4️⃣ **Nó 4: Code - Parse Resposta Gemini**

**Linguagem:** JavaScript

**Código:**
```javascript
const response = $input.item.json;
let result;

try {
  // Extrair texto da resposta do Gemini
  const text = response.candidates[0].content.parts[0].text;
  
  // Remover markdown code blocks se presente
  const jsonText = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  
  // Parse JSON
  result = JSON.parse(jsonText);
  
} catch (error) {
  // Fallback em caso de erro
  result = {
    texto_ocr: "Erro ao processar OCR",
    nota_final: 0,
    feedback_geral: "Erro no processamento: " + error.message,
    exercicios: []
  };
}

// Retornar com assessment_id
return {
  json: {
    assessment_id: $('Webhook').item.json.assessment_id,
    texto_ocr: result.texto_ocr || '',
    nota_final: result.nota_final || 0,
    feedback_geral: result.feedback_geral || '',
    exercicios: result.exercicios || []
  }
};
```

---

### 5️⃣ **Nó 5: HTTP Request - Enviar Resultado**

**⚠️ IMPORTANTE: Este é o passo crucial!**

**Configuração:**
- Method: `POST`
- URL: `https://correct80-20.preview.emergentagent.com/api/webhook/result`
- Headers:
  - `Content-Type: application/json`

**Body JSON:**
```json
{
  "assessment_id": "{{ $json.assessment_id }}",
  "texto_ocr": "{{ $json.texto_ocr }}",
  "nota_final": {{ $json.nota_final }},
  "feedback_geral": "{{ $json.feedback_geral }}",
  "exercicios": {{ JSON.stringify($json.exercicios) }}
}
```

**O que faz:** Envia o resultado de volta para o backend

---

## 🎯 Respostas para suas Perguntas

### ❓ "Como capturamos essa resposta?"

**R:** O N8N faz um **HTTP Request POST** de volta para o backend no endpoint `/api/webhook/result`. Já está implementado!

### ❓ "O n8n deve enviar o conteudo usando um http?"

**R:** **SIM!** Use o nó **"HTTP Request"** no final do workflow (Nó 5 acima). 

**❌ NÃO USE "Respond to Webhook"** - isso só responde para quem chamou inicialmente (o frontend), mas o frontend já recebeu resposta e desconectou.

### ❓ "No campo de aguardando avaliação deve aparecer processando?"

**R:** **JÁ IMPLEMENTADO!** 
- Status `pending` → Badge azul "🔄 Processando no N8N..."
- Status `completed` → Badge amarelo "⏳ Aguardando Validação"
- Auto-refresh a cada 10 segundos na tela de pendentes

---

## 🧪 Como Testar

### 1. **Teste Manual - Simular N8N**

Execute este script para simular resposta do N8N:

```bash
# No servidor
/tmp/test_n8n_response.sh
```

Ou faça o curl manualmente:

```bash
curl -X POST https://correct80-20.preview.emergentagent.com/api/webhook/result \
  -H "Content-Type: application/json" \
  -d '{
    "assessment_id": "SEU_ASSESSMENT_ID_AQUI",
    "texto_ocr": "Texto transcrito...",
    "nota_final": 8.5,
    "feedback_geral": "Ótimo trabalho!",
    "exercicios": [
      {
        "numero": 1,
        "nota": 3.0,
        "nota_maxima": 3.0,
        "feedback": "Perfeito!"
      }
    ]
  }'
```

### 2. **Teste Completo com N8N Real**

1. Configure o workflow no N8N seguindo os passos acima
2. Ative o workflow
3. Copie a URL do webhook
4. Cole nas Configurações do Admin (Gemini API + N8N Webhook)
5. Faça upload de uma prova no frontend
6. Aguarde o processamento (10-30 segundos)
7. Veja o resultado em "Aguardando Validação"

---

## 🔍 Debugging

### Ver logs do webhook no backend:

```bash
tail -f /var/log/supervisor/nextjs.out.log | grep webhook
```

### Ver avaliações no banco:

```javascript
// No servidor
cd /app && node -e "
const { MongoClient } = require('mongodb');
(async () => {
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('corretor_80_20');
  
  const avaliacoes = await db.collection('avaliacoes_corrigidas').find({}).toArray();
  
  avaliacoes.forEach(av => {
    console.log({
      id: av.id,
      status: av.status,
      nota: av.nota,
      aluno: av.alunoId
    });
  });
  
  await client.close();
})();
"
```

---

## ✅ Checklist de Configuração

- [ ] Workflow N8N criado com os 5 nós
- [ ] Gemini API Key configurada no N8N
- [ ] URL do webhook copiada do N8N
- [ ] URL colada nas Configurações do Admin
- [ ] Gemini API Key do admin configurada
- [ ] Workflow ativado no N8N
- [ ] Teste com upload de uma prova
- [ ] Verificar "Processando no N8N..." aparece
- [ ] Aguardar resposta do N8N (10-30s)
- [ ] Verificar mudança para "Aguardando Validação"
- [ ] Clicar e ver correção no modal

---

## 🎨 Estados da Avaliação

| Status | Badge | Descrição | Clicável? |
|--------|-------|-----------|-----------|
| `pending` | 🔄 Processando no N8N... (azul) | N8N está processando | ❌ Não |
| `completed` + não validado | ⏳ Aguardando Validação (amarelo) | Pronto para validar | ✅ Sim |
| `completed` + validado | ✅ Concluída (verde) | Validada pelo tutor | ✅ Sim |

---

## 📞 Próximos Passos

Depois de configurar:

1. ✅ Testar fluxo completo
2. ✅ Validar que modal abre com imagem + correção
3. ✅ Botão de validar funcionando
4. ✅ Move para "Avaliações Concluídas"

Tudo pronto! 🚀
