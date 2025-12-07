# Proposta de Implementação: Sistema de Pagamento e Assinatura

## 📋 Situação Atual

O sistema atualmente possui:
- ✅ Campo `assinatura` no modelo de usuário (valores: 'free', 'premium', 'admin')
- ✅ Sistema de créditos
- ❌ **NÃO possui** integração com gateway de pagamento
- ❌ **NÃO possui** confirmação automática de pagamento
- ❌ **NÃO possui** funcionalidades de cancelar/reativar/renovar assinatura

## 🎯 Objetivo

Implementar um sistema completo de assinaturas com:
1. Integração com gateway de pagamento (Stripe recomendado)
2. Confirmação automática de pagamento via webhooks
3. Gerenciamento de assinatura pelo usuário (cancelar, reativar, renovar)
4. Suporte a planos mensais e anuais

## 💡 Recomendação: Stripe

**Por que Stripe?**
- ✅ Melhor suporte para mercado brasileiro
- ✅ Aceita cartões de crédito/débito brasileiros
- ✅ Suporte a Pix (via Stripe Connect ou integração separada)
- ✅ Webhooks robustos para confirmação de pagamento
- ✅ Dashboard completo para gerenciamento
- ✅ SDK bem documentado
- ✅ Testes com cartões de teste

**Alternativas:**
- Mercado Pago (mais popular no Brasil, mas menos flexível)
- Asaas (focado em assinaturas, mas menos conhecido internacionalmente)

## 🏗️ Arquitetura Proposta

### 1. Estrutura de Dados

#### Collection: `subscriptions`
```javascript
{
  id: "uuid",
  userId: "uuid",
  stripeCustomerId: "cus_xxx",
  stripeSubscriptionId: "sub_xxx",
  plan: "pro_monthly" | "pro_yearly",
  status: "active" | "canceled" | "past_due" | "unpaid" | "trialing",
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: Boolean, // Se true, cancela ao fim do período
  canceledAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

#### Collection: `payments` (Histórico de pagamentos)
```javascript
{
  id: "uuid",
  userId: "uuid",
  subscriptionId: "uuid",
  stripePaymentIntentId: "pi_xxx",
  amount: Number, // em centavos
  currency: "brl",
  status: "succeeded" | "pending" | "failed",
  paymentMethod: "card" | "pix",
  createdAt: Date
}
```

### 2. Fluxo de Assinatura

```
1. Usuário clica em "Assinar Agora"
   ↓
2. Frontend chama /api/subscriptions/create-checkout
   ↓
3. Backend cria sessão de checkout no Stripe
   ↓
4. Usuário é redirecionado para Stripe Checkout
   ↓
5. Usuário completa pagamento
   ↓
6. Stripe envia webhook para /api/webhooks/stripe
   ↓
7. Backend atualiza assinatura do usuário
   ↓
8. Usuário é redirecionado para /dashboard?success=true
```

### 3. Endpoints da API

#### `/api/subscriptions/create-checkout` (POST)
- Cria sessão de checkout no Stripe
- Retorna URL para redirecionamento

#### `/api/subscriptions/status` (GET)
- Retorna status atual da assinatura do usuário
- Informações: plano, status, data de renovação, etc.

#### `/api/subscriptions/cancel` (POST)
- Cancela assinatura (marca para cancelar ao fim do período)
- Atualiza `cancelAtPeriodEnd: true`

#### `/api/subscriptions/reactivate` (POST)
- Reativa assinatura cancelada
- Atualiza `cancelAtPeriodEnd: false`

#### `/api/subscriptions/update` (POST)
- Atualiza plano (mensal ↔ anual)
- Cria nova assinatura e cancela a antiga

#### `/api/webhooks/stripe` (POST)
- Recebe eventos do Stripe
- Processa: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`, etc.

### 4. Componentes Frontend

#### `SubscriptionManagement.jsx`
- Exibe status da assinatura
- Botões: Cancelar, Reativar, Alterar Plano
- Histórico de pagamentos

#### `CheckoutButton.jsx`
- Botão para iniciar checkout
- Passa plano (mensal/anual) como parâmetro

## 📦 Dependências Necessárias

```bash
npm install stripe @stripe/stripe-js
```

## 🔧 Variáveis de Ambiente

```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

## 🚀 Passos de Implementação

### Fase 1: Setup Básico
1. Criar conta no Stripe
2. Instalar dependências
3. Configurar variáveis de ambiente
4. Criar estrutura de dados no MongoDB

### Fase 2: Checkout
1. Implementar `/api/subscriptions/create-checkout`
2. Criar componente `CheckoutButton`
3. Testar fluxo de checkout

### Fase 3: Webhooks
1. Implementar `/api/webhooks/stripe`
2. Configurar webhook no dashboard Stripe
3. Testar eventos: `checkout.session.completed`, `invoice.payment_succeeded`

### Fase 4: Gerenciamento
1. Implementar endpoints de cancelar/reativar
2. Criar componente `SubscriptionManagement`
3. Integrar na seção de Configurações

### Fase 5: Atualização de Plano
1. Implementar endpoint de atualização
2. Adicionar UI para trocar entre mensal/anual

## 🔒 Segurança

- ✅ Validar webhook signature do Stripe
- ✅ Nunca expor secret keys no frontend
- ✅ Validar permissões do usuário em todos os endpoints
- ✅ Logs de todas as transações

## 📊 Monitoramento

- Dashboard do Stripe para pagamentos
- Logs de webhooks recebidos
- Alertas para falhas de pagamento
- Métricas de conversão (checkout → pagamento)

## 💰 Preços Sugeridos

- **Mensal**: R$ 49/mês
- **Anual**: R$ 39/mês (R$ 468/ano) - 20% desconto

## ⚠️ Considerações Importantes

1. **Testes**: Sempre testar em modo de teste do Stripe antes de produção
2. **Webhooks**: Usar ngrok ou similar para testar webhooks localmente
3. **Fallback**: Se webhook falhar, ter job para verificar assinaturas pendentes
4. **Notificações**: Enviar email ao usuário em eventos importantes (pagamento, cancelamento, etc.)

## 📝 Próximos Passos

1. Revisar e aprovar esta proposta
2. Criar conta no Stripe
3. Implementar Fase 1 (Setup Básico)
4. Testar em ambiente de desenvolvimento
5. Implementar fases subsequentes

---

**Nota**: Esta é uma proposta inicial. Podemos ajustar conforme suas necessidades específicas.

