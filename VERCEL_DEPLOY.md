# Guia de Deploy no Vercel

Este documento contém as instruções necessárias para fazer o deploy do SaaS no Vercel.

## Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no painel do Vercel (Settings > Environment Variables):

### Obrigatórias

- `MONGO_URL`: String de conexão do MongoDB (ex: `mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority`)
- `JWT_SECRET`: Chave secreta para assinatura de tokens JWT (use uma string aleatória segura)
- `NEXT_PUBLIC_BASE_URL`: URL base da aplicação (ex: `https://seu-app.vercel.app`)

### Opcionais

- `DB_NAME`: Nome do banco de dados (padrão: `corretor_80_20`)
- `CORS_ORIGINS`: Origens permitidas para CORS (padrão: `*`)
- `NEXTAUTH_URL`: URL para autenticação (fallback para `NEXT_PUBLIC_BASE_URL`)
- `GOOGLE_CLIENT_ID`: Client ID do Google OAuth (apenas se usar login com Google)
- `GOOGLE_CLIENT_SECRET`: Client Secret do Google OAuth (apenas se usar login com Google)

## Configurações do Build

O projeto está configurado para funcionar no Vercel:

- ✅ `next.config.js` configurado corretamente (sem `output: 'standalone'`)
- ✅ Middleware compatível com Edge Runtime
- ✅ Imports limpos e otimizados

## Comandos de Build

O Vercel detecta automaticamente o Next.js e usa:
- **Build Command**: `next build` (automático)
- **Output Directory**: `.next` (automático)
- **Install Command**: `yarn install` ou `npm install` (automático)

## Notas Importantes

1. **Sistema de Arquivos**: O Vercel usa um sistema de arquivos read-only. Uploads de arquivos devem ser feitos para um serviço externo (S3, Cloudinary, etc.) em produção.

2. **MongoDB Atlas**: Certifique-se de que o IP do Vercel está na whitelist do MongoDB Atlas, ou configure para aceitar conexões de qualquer IP (`0.0.0.0/0`) para desenvolvimento.

3. **Variáveis Públicas**: Variáveis que começam com `NEXT_PUBLIC_` são expostas ao cliente. Não coloque informações sensíveis nelas.

4. **JWT_SECRET**: Gere uma chave segura para produção:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

## Troubleshooting

### Erro de Build

Se o build falhar:
1. Verifique se todas as variáveis de ambiente obrigatórias estão configuradas
2. Verifique os logs de build no Vercel
3. Teste o build localmente: `yarn build`

### Erro de Conexão MongoDB

Se houver erro de conexão:
1. Verifique se `MONGO_URL` está correta
2. Verifique se o IP do Vercel está na whitelist do MongoDB Atlas
3. Verifique se o usuário do MongoDB tem permissões adequadas

### Erro de Autenticação

Se houver erro de autenticação:
1. Verifique se `JWT_SECRET` está configurado
2. Verifique se `NEXT_PUBLIC_BASE_URL` está correto

