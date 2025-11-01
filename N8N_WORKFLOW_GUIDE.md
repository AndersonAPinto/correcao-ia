# N8N Workflow Setup Guide

## Overview
This N8N workflow receives student answer photos, performs OCR + grading using Gemini AI, and returns results to the application.

## Workflow Structure

### 1. Webhook Node (Start)
- **Type**: Webhook (POST)
- **Path**: Choose a unique path (e.g., `/webhook/grade-student-answer`)
- **Response Mode**: Immediately
- **Authentication**: None (secured by user_id validation)

**Expected Input Payload:**
```json
{
  "user_id": "uuid-of-user",
  "assessment_id": "uuid-of-assessment",
  "image_url": "https://your-domain.com/uploads/image.jpg",
  "gabarito_id": "uuid-of-gabarito",
  "gabarito_content": "The correct answer text/criteria..."
}
```

### 2. HTTP Request Node - Download Image
- **Method**: GET
- **URL**: `{{ $json.image_url }}`
- **Response Format**: Binary Data
- **Output**: Binary file (student answer image)

### 3. Gemini API Node - OCR + Grading
- **Method**: POST
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={{ $credentials.geminiApiKey }}`
- **Headers**:
  - Content-Type: application/json
- **Body**:
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
        "text": "Você é um corretor de provas experiente. Analise a imagem da resposta manuscrita do aluno.\n\nGABARITO OFICIAL:\n{{ $('Webhook').item.json.gabarito_content }}\n\nTarefas:\n1. Transcreva o texto manuscrito da imagem (OCR)\n2. Compare com o gabarito oficial\n3. Atribua uma nota de 0 a 10\n4. Forneça feedback construtivo em 2-3 frases\n\nRetorne APENAS um JSON válido no formato:\n{\n  \"texto_ocr\": \"texto transcrito aqui\",\n  \"nota\": 8.5,\n  \"feedback\": \"Seu feedback aqui\"\n}"
      }
    ]
  }]
}
```

### 4. Code Node - Parse Gemini Response
- **Language**: JavaScript
- **Code**:
```javascript
const response = $input.item.json;
let result;

try {
  // Extract text from Gemini response
  const text = response.candidates[0].content.parts[0].text;
  
  // Parse JSON from response (remove markdown code blocks if present)
  const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  result = JSON.parse(jsonText);
  
} catch (error) {
  // Fallback if parsing fails
  result = {
    texto_ocr: "OCR failed",
    nota: 0,
    feedback: "Error processing response: " + error.message
  };
}

return {
  json: {
    assessment_id: $('Webhook').item.json.assessment_id,
    texto_ocr: result.texto_ocr || '',
    nota: result.nota || 0,
    feedback: result.feedback || 'No feedback provided'
  }
};
```

### 5. HTTP Request Node - Send Results Back
- **Method**: POST
- **URL**: `https://correct80-20.preview.emergentagent.com/api/webhook/result`
- **Headers**:
  - Content-Type: application/json
- **Body**:
```json
{
  "assessment_id": "{{ $json.assessment_id }}",
  "texto_ocr": "{{ $json.texto_ocr }}",
  "nota": {{ $json.nota }},
  "feedback": "{{ $json.feedback }}"
}
```

## Setup Instructions

1. **Create New Workflow** in N8N
2. **Add Nodes** in the order above
3. **Configure Gemini API Key**:
   - Go to N8N Settings → Credentials
   - Add new credential (HTTP Header Auth or Custom)
   - Store your Gemini API key
4. **Activate Workflow**
5. **Copy Webhook URL** from the Webhook node
6. **Add to App Settings**:
   - Login to Corretor 80/20
   - Go to Settings tab
   - Paste the webhook URL
   - Save

## Testing

1. Create an answer key in the app
2. Upload a test image
3. Check N8N execution logs
4. Verify results appear in the Results tab

## Troubleshooting

- **Webhook not triggered**: Check URL is correct and workflow is activated
- **Gemini API errors**: Verify API key and quota
- **No results returned**: Check N8N execution logs for errors
- **Image not loading**: Ensure image URL is publicly accessible

## Cost Estimate

- Each grading costs 3 credits
- Gemini API pricing applies (check Google AI Studio)
- Average processing time: 5-15 seconds

## Alternative: Simple Version Without N8N

If you prefer to skip N8N, you can modify the app to call Gemini directly from the backend. Let me know if you need this simpler version!
