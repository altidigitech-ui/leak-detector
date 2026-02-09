# Stripe Launch Checklist

## Before Going Live
1. [ ] Create products in Stripe Dashboard (Live mode):
   - Pro Plan: €29/month recurring
   - Agency Plan: €99/month recurring
2. [ ] Copy the Price IDs into Railway env vars:
   - STRIPE_PRICE_PRO_MONTHLY=price_xxx
   - STRIPE_PRICE_AGENCY_MONTHLY=price_xxx
3. [ ] Switch API keys in Railway:
   - STRIPE_SECRET_KEY=sk_live_xxx
4. [ ] Switch publishable key in Vercel:
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
5. [ ] Configure webhook in Stripe Dashboard:
   - URL: https://api.leakdetector.tech/api/v1/webhooks/stripe
   - Events: checkout.session.completed, customer.subscription.created, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed
6. [ ] Copy webhook signing secret to Railway:
   - STRIPE_WEBHOOK_SECRET=whsec_xxx
7. [ ] Test with Stripe CLI:
   ```bash
   stripe listen --forward-to https://api.leakdetector.tech/api/v1/webhooks/stripe
   stripe trigger checkout.session.completed
   ```
8. [ ] Make a real test purchase (use a real card, refund after)
