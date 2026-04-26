/**
 * StripeService — account-lifecycle operations during user deletion.
 *
 * This project currently uses an internal credits system, not Stripe.
 * This service is wired into AccountDeletionService and becomes active
 * automatically once STRIPE_SECRET_KEY is added to the environment.
 *
 * When Stripe IS active, the deletion flow:
 *   1. Cancels the active subscription (immediate or at period end — configurable)
 *   2. Detaches all saved payment methods
 *   3. Leaves the Stripe customer record intact for financial audit trail
 *
 * When Stripe is NOT configured, every method is a documented no-op.
 */

let stripe = null;

function getStripe() {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe');
    stripe = new Stripe(key, { apiVersion: '2024-04-10' });
    return stripe;
  } catch {
    console.warn('[STRIPE] stripe package not installed — Stripe integration disabled.');
    return null;
  }
}

export class StripeService {
  /**
   * Cancels the user's active Stripe subscription.
   *
   * @param {string} stripeCustomerId
   * @param {'immediate'|'period_end'} strategy
   *   'period_end' — user keeps access until paid period ends (LGPD-friendly default)
   *   'immediate'  — billing stops now
   */
  async cancelSubscription(stripeCustomerId, strategy = 'period_end') {
    const client = getStripe();
    if (!client || !stripeCustomerId) return { skipped: true };

    console.log(`[STRIPE] Cancelling subscription for customer ${stripeCustomerId} (strategy: ${strategy})`);

    const subscriptions = await client.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 10,
    });

    const results = [];
    for (const sub of subscriptions.data) {
      if (strategy === 'immediate') {
        const cancelled = await client.subscriptions.cancel(sub.id);
        results.push({ id: sub.id, status: cancelled.status });
      } else {
        const updated = await client.subscriptions.update(sub.id, { cancel_at_period_end: true });
        results.push({ id: sub.id, cancel_at: updated.cancel_at });
      }
    }

    console.log(`[STRIPE] Subscription cancellation complete:`, results);
    return { cancelled: results };
  }

  /**
   * Detaches all payment methods from the customer.
   * Financial records (invoices, charges) remain on Stripe for legal purposes.
   */
  async detachAllPaymentMethods(stripeCustomerId) {
    const client = getStripe();
    if (!client || !stripeCustomerId) return { skipped: true };

    console.log(`[STRIPE] Detaching payment methods for customer ${stripeCustomerId}`);

    const paymentMethods = await client.paymentMethods.list({ customer: stripeCustomerId, limit: 20 });
    const results = [];
    for (const pm of paymentMethods.data) {
      await client.paymentMethods.detach(pm.id);
      results.push(pm.id);
    }

    console.log(`[STRIPE] Detached ${results.length} payment method(s)`);
    return { detached: results };
  }

  /**
   * Handles Stripe webhook events relevant to the deletion flow.
   * Wire into app/api/webhooks/stripe/route.js when Stripe is activated.
   */
  async handleWebhookEvent(event, db) {
    switch (event.type) {
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await db.collection('users').updateOne(
          { stripeCustomerId: sub.customer },
          { $set: { assinatura: 'free', stripeSubscriptionId: null } }
        );
        console.log(`[STRIPE WEBHOOK] subscription.deleted for customer ${sub.customer}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.warn(`[STRIPE WEBHOOK] invoice.payment_failed for customer ${invoice.customer}`);
        await db.collection('logs_auditoria').insertOne({
          id: crypto.randomUUID(),
          userId: null,
          acao: 'stripe_payment_failed',
          detalhes: { customerId: invoice.customer, invoiceId: invoice.id, attemptCount: invoice.attempt_count },
          ip: 'stripe-webhook',
          userAgent: 'stripe',
          createdAt: new Date(),
        });
        break;
      }

      default:
        break;
    }
  }
}

export default new StripeService();
