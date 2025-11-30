#!/bin/bash

echo "🔄 Reiniciando servidor e criando usuários de teste..."
echo ""

# Encontrar e matar processo npm run dev
echo "1️⃣ Parando servidor atual..."
pkill -f "npm run dev" || echo "   Nenhum servidor rodando"
sleep 2

# Iniciar servidor em background
echo "2️⃣ Iniciando servidor..."
cd "$(dirname "$0")"
npm run dev > /tmp/corretor-dev.log 2>&1 &
SERVER_PID=$!
echo "   Servidor iniciado (PID: $SERVER_PID)"

# Aguardar servidor iniciar
echo "3️⃣ Aguardando servidor iniciar..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "   ✅ Servidor pronto!"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# Verificar conexão MongoDB
echo "4️⃣ Verificando conexão MongoDB..."
HEALTH_CHECK=$(curl -s http://localhost:3000/api/health)
echo "$HEALTH_CHECK" | jq .

if echo "$HEALTH_CHECK" | grep -q '"mongodb":"connected"'; then
    echo "   ✅ MongoDB conectado!"
    
    # Criar usuários
    echo ""
    echo "5️⃣ Criando usuários de teste..."
    SEED_RESULT=$(curl -s -X POST http://localhost:3000/api/health \
        -H "Content-Type: application/json" \
        -d '{"action": "seed_users"}')
    echo "$SEED_RESULT" | jq .
    
    echo ""
    echo "✅ Processo concluído!"
    echo ""
    echo "📝 Você pode fazer login com:"
    echo "   Admin: admin@admin.com / 12345678"
    echo "   User:  user@user.com / 12345678"
    echo ""
    echo "🌐 Acesse: http://localhost:3000"
    echo ""
    echo "📊 Logs do servidor: tail -f /tmp/corretor-dev.log"
else
    echo "   ❌ MongoDB não conectou. Verifique os logs:"
    echo "   tail -f /tmp/corretor-dev.log"
    exit 1
fi
