# 🔐 Configuração Google OAuth - Variáveis de Ambiente

## ✅ Implementação Concluída

A autenticação com Google OAuth foi implementada com todas as medidas de segurança necessárias.

## 📝 Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
NEXTAUTH_URL=http://localhost:3000
```

**Nota**: Em produção, use:
```env
NEXTAUTH_URL=https://seu-dominio.com
```

## 🔧 Como Obter as Credenciais

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie ou selecione um projeto
3. Vá em **APIs & Services** → **Credentials**
4. Clique em **Create Credentials** → **OAuth client ID**
5. Configure:
   - **Application type**: Web application
   - **Name**: Corretor 80/20
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (desenvolvimento)
     - `https://seu-dominio.com` (produção)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/google/callback` (desenvolvimento)
     - `https://seu-dominio.com/api/auth/google/callback` (produção)

## ✅ Funcionalidades Implementadas

- ✅ Login com Google
- ✅ Validação de segurança (audience, email verificado, expiração)
- ✅ Proteção CSRF (state parameter)
- ✅ Proteção contra account takeover
- ✅ Logs de segurança
- ✅ Tratamento de erros
- ✅ Criação automática de usuário
- ✅ Atualização de último login

## 🚀 Como Testar

1. Adicione as variáveis ao `.env`
2. Reinicie o servidor: `yarn dev`
3. Acesse a página de login
4. Clique em "Continuar com Google"
5. Faça login com sua conta Google

## 📁 Arquivos Criados

- `app/api/auth/google/route.js` - Inicia o fluxo OAuth
- `app/api/auth/google/callback/route.js` - Processa o callback
- `app/page.js` - Atualizado com botão de login Google

## 🔒 Medidas de Segurança

- ✅ Validação de audience do token
- ✅ Verificação de email verificado
- ✅ Validação de expiração do token
- ✅ Proteção CSRF com state parameter
- ✅ Proteção contra account takeover
- ✅ Logs de segurança (coleção `auth_logs`)
- ✅ Tratamento de erros adequado

## 📊 Schema de Usuário Atualizado

Os usuários criados via Google OAuth terão:
- `authProvider: 'google'`
- `googleId: string` (ID único do Google)
- `emailVerified: true`
- `password: null` (sem senha)
- `picture: string | null` (foto do perfil)

