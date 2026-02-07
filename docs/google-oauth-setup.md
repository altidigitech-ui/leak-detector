# Google OAuth Setup

## Supabase Configuration
1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Enable Google provider
3. Copy the Redirect URL shown (format: `https://xxx.supabase.co/auth/v1/callback`)

## Google Cloud Console
1. Go to https://console.cloud.google.com
2. Create or select your project
3. Navigate to APIs & Services → Credentials
4. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: Leak Detector
   - Authorized JavaScript origins:
     - `https://leakdetector.tech`
     - `http://localhost:3000` (for development)
   - Authorized redirect URIs:
     - Paste the Supabase Redirect URL from step 3 above
5. Copy Client ID and Client Secret

## Back to Supabase
1. Paste Client ID and Client Secret in the Google provider settings
2. Save

## Verify Auth Callback Route
The frontend already has the callback route at `frontend/src/app/auth/callback/route.ts`.
It exchanges the auth code for a session and redirects to /dashboard.

Make sure the Supabase URL Configuration (Authentication → URL Configuration) includes:
- Site URL: `https://leakdetector.tech`
- Redirect URLs: `https://leakdetector.tech/auth/callback`

## Testing
1. Open https://leakdetector.tech/login
2. Click "Sign in with Google"
3. Complete Google consent
4. Should redirect to /dashboard with user logged in
