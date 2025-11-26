# Problema: Erro SSL/TLS MongoDB Atlas

## Erro Encontrado

```
MongoServerSelectionError: ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR
```

Este erro ocorre ao tentar conectar com MongoDB Atlas.

---

## Possíveis Causas

1. **IP não está no whitelist do MongoDB Atlas**
   - MongoDB Atlas bloqueia conexões de IPs não autorizados
   - Solução: Adicionar IP ao Network Access

2. **Problema de rede/firewall**
   - Firewall bloqueando conexões SSL
   - Proxy interferindo na conexão
   - Solução: Verificar configurações de rede

3. **Versão do Node.js/OpenSSL incompatível**
   - Versões antigas podem ter problemas com TLS 1.3
   - Solução: Atualizar Node.js

4. **Configurações SSL muito restritivas**
   - Certificados ou configurações muito restritivas
   - Solução: Ajustar configurações de conexão

---

## Soluções Aplicadas

### 1. Ajuste de Timeouts
- `serverSelectionTimeoutMS`: 5000 → 30000ms
- Adicionado `connectTimeoutMS: 30000`
- Isso dá mais tempo para estabelecer conexão

### 2. Remoção de Configuração TLS Explícita
- Para `mongodb+srv://`, o TLS é gerenciado automaticamente
- Removida configuração `tls: true` explícita que pode causar conflitos

### 3. Configurações Adicionais
- `heartbeatFrequencyMS: 10000` - Mantém conexão ativa
- `directConnection: false` - Usa replica set corretamente

---

## Verificações Necessárias no MongoDB Atlas

### 1. Network Access (Whitelist de IPs)

1. Acesse: https://cloud.mongodb.com/
2. Vá em **Network Access**
3. Clique em **Add IP Address**
4. Adicione:
   - Seu IP atual (clique em "Add Current IP Address")
   - OU `0.0.0.0/0` para permitir todos os IPs (apenas para desenvolvimento)
5. Aguarde alguns minutos para a mudança ser aplicada

### 2. Database Access (Usuário e Senha)

1. Vá em **Database Access**
2. Verifique se o usuário existe
3. Verifique se a senha está correta
4. Se necessário, crie um novo usuário:
   - Username: `aaugustosilvapinto_db_user`
   - Password: `9BIHi5u96jnXlZ01`
   - Database User Privileges: **Read and write to any database**

### 3. Connection String

Verifique se a string de conexão está correta:
```
mongodb+srv://aaugustosilvapinto_db_user:9BIHi5u96jnXlZ01@corretor-ia.ijh7vga.mongodb.net/
```

---

## Teste de Conexão

### Via mongosh (se instalado)

```bash
mongosh "mongodb+srv://aaugustosilvapinto_db_user:9BIHi5u96jnXlZ01@corretor-ia.ijh7vga.mongodb.net/"
```

### Via Node.js (script de teste)

```bash
node verificar-admin.js
```

---

## Solução Alternativa: MongoDB Local

Se o problema persistir, você pode usar MongoDB local para desenvolvimento:

### 1. Instalar MongoDB Local

```bash
# Ubuntu/Debian
sudo apt-get install mongodb

# Ou usar Docker
docker run -d -p 27017:27017 --name mongodb mongo
```

### 2. Atualizar .env

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=corretor_80_20
```

### 3. Reiniciar Servidor

```bash
yarn dev
```

---

## Próximos Passos

1. **Verificar Network Access no Atlas**
   - Adicionar IP atual ou `0.0.0.0/0`
   - Aguardar alguns minutos

2. **Reiniciar Servidor**
   ```bash
   # Parar servidor (Ctrl+C)
   yarn dev
   ```

3. **Testar Conexão**
   - Tentar fazer login novamente
   - Verificar logs do servidor

4. **Se ainda não funcionar**
   - Verificar logs detalhados
   - Considerar usar MongoDB local temporariamente
   - Verificar versão do Node.js: `node --version` (deve ser 18+)

---

## Status

- ✅ Código ajustado (timeouts aumentados, configurações otimizadas)
- ⏳ **Ação necessária:** Verificar Network Access no MongoDB Atlas
- ⏳ **Ação necessária:** Reiniciar servidor e testar

---

**Após verificar Network Access, reinicie o servidor e teste novamente!**

