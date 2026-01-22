# Configuração de Variáveis de Ambiente no Vercel

## ⚠️ Importante

Em produção, o Next.js **NÃO lê arquivos `.env` automaticamente**. As variáveis de ambiente devem estar configuradas no painel do Vercel.

## 📋 Variáveis Necessárias

Configure as seguintes variáveis de ambiente no Vercel:

### 1. GOOGLE_CLOUD_PROJECT_ID
- **Valor**: `corregia`
- **Descrição**: ID do projeto no Google Cloud Platform

### 2. GOOGLE_CLOUD_CREDENTIALS
- **Valor**: JSON completo das credenciais da conta de serviço
- **Formato**: String JSON (não um arquivo)
- **Exemplo**:
```json
{
  "type": "service_account",
  "project_id": "corregia",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "corregia@corregia.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/...",
  "universe_domain": "googleapis.com"
}
```

### 3. GOOGLE_CLOUD_LOCATION (Opcional)
- **Valor**: `us-east4`
- **Descrição**: Região do Vertex AI (padrão: us-east4)

## 🔧 Como Configurar no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Clique em **Add New**
5. Adicione cada variável:
   - **Name**: Nome da variável (ex: `GOOGLE_CLOUD_PROJECT_ID`)
   - **Value**: Valor da variável
   - **Environment**: Selecione **Production**, **Preview** e **Development** conforme necessário
6. Clique em **Save**
7. **Importante**: Após adicionar as variáveis, faça um novo deploy para que as mudanças tenham efeito

## ✅ Verificação

Após configurar e fazer o deploy, você pode verificar se está funcionando acessando:

```
https://www.corregia.com.br/api/test/vertex-config
```

A resposta deve mostrar:
```json
{
  "status": "CONFIGURADO",
  "configured": true,
  "environment": "production"
}
```

## 🐛 Troubleshooting

### Erro: "Project ID ausente"
- Verifique se `GOOGLE_CLOUD_PROJECT_ID` está configurado no Vercel
- Certifique-se de que o valor não é um placeholder

### Erro: "Credenciais não encontradas"
- Verifique se `GOOGLE_CLOUD_CREDENTIALS` está configurado no Vercel
- Certifique-se de que o JSON está completo e válido
- Verifique se não há quebras de linha extras ou caracteres especiais

### Variáveis não estão sendo aplicadas
- Certifique-se de fazer um novo deploy após adicionar/modificar variáveis
- Verifique se selecionou o ambiente correto (Production, Preview, Development)

## 📝 Notas

- As variáveis de ambiente são sensíveis e não devem ser commitadas no Git
- O arquivo `.env` funciona apenas em desenvolvimento local
- Em produção, sempre use as variáveis configuradas na plataforma de deploy
