# Deployment Checklist

1. Push the frontend files to `main`.
2. In GitHub: Settings → Pages → Source → GitHub Actions.
3. Wait for the Actions deployment to finish.
4. Copy the GitHub Pages URL.
5. In Supabase (**Rizog Labs Studio**) → Authentication → URL Configuration, set the Site URL and allowed Redirect URL to the production GitHub Pages URL.
6. Create the internal Studio user in Supabase Authentication.
7. Test login, Test Installation Code, Generate Activation, refresh/history, and Revoke.