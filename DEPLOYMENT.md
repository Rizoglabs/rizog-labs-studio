# Deployment Checklist

1. Push the frontend files to `main`.
2. In GitHub: Settings → Pages → Source → GitHub Actions.
3. Wait for the Actions deployment to finish.
4. Production URL: `https://rizoglabs.github.io/rizog-labs-studio/`. Copy/verify this URL after deployment.
5. In Supabase (**Rizog Labs Studio**) → Authentication → URL Configuration, set the Site URL and allowed Redirect URL to the production GitHub Pages URL.
6. Create the internal Studio user in Supabase Authentication.
7. Test login, Test Installation Code, Generate Activation, refresh/history, and Revoke.
 
## Product Registry rollout

The Product Registry depends on a schema migration and the updated `rizogkey-admin` Edge Function. Roll them out before the GitHub Pages frontend:

1. Review and apply `supabase/migrations/20261005050000_product_registry_v1.sql` to the Rizog Labs Studio database.
2. Deploy `supabase/functions/rizogkey-admin/index.ts` with the `supabase/config.toml` project configuration.
3. Verify the Edge Function is healthy and that its product actions require a valid Studio session.
4. Deploy the frontend through GitHub Pages.
5. Confirm the existing `RUPKAS` row appears with its existing code, brand, and `UNKNOWN` platform; no product or historical records are deleted.
6. Confirm Product Code uniqueness, immutable Product Code during edit, ACTIVE-only provisioning, and archived product history.

The hosted project has schema migration history that is not currently represented in this repository. Do not run `supabase db push` from this checkout until the existing migration history is recovered or reconciled. Keep direct Data API access to licensing tables locked; product operations use the authenticated Edge Function.
