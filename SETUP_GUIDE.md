# SETUP_GUIDE.md — Supabase, Firebase, Google OAuth, Payments & Mobile

This guide covers everything that is **not done for you** and that you said you will configure yourself (Supabase, Firebase, Google OAuth). The code, SQL, payment pages, and UI are already in place and verified. Follow these steps in order to go live.

> Note on "Expo": this repository does **not** use Expo. Its mobile wrapper is **Capacitor 8 (Android)** (`android/` + `@capacitor/*`). The mobile section below is for Capacitor.

---

## 0. What is already done (no action needed)

| Item | State |
|---|---|
| Repo cloned to `~/Downloads/prakash-PICU` | ✅ done |
| `npm install` | ✅ done |
| `.env` created from `.env.example` | ✅ done (placeholder values) |
| Payment system (Kapoori-ka model, NPR 2,500/year) | ✅ built |
| `npm test` | ✅ 23/23 pass |
| `npm run build` | ✅ passes |
| `npm run lint` | ✅ 0 errors (pre-existing warnings only) |

Run it anytime with:

```bash
cd ~/Downloads/prakash-PICU && npm run dev
```

---

## 1. Supabase (auth + database + storage)

`src/lib/supabase.js` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### Steps

1. **Create a project** at <https://supabase.com> (institution-controlled).
2. In **Project Settings → API**, copy **Project URL** and the **anon/public** key (never the `service_role` key).
3. Put them in `.env`:

   ```bash
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Run the SQL migrations** in the SQL Editor, in this order:
   - `sql/migration.sql` — core schema (profiles, patients, fluid balance, drugs, investigations, notes, images, drug library, education, `is_admin()`).
   - `sql/subscriptions.sql` — **the new payment system**: `subscription_plans` (single plan, NPR 2,500), `payments`, `activation_codes` (SHA-256 hashed), `rate_limits`, `subscriptions`, plus the `redeem_activation_code` and `admin_void_codes` RPCs.
   - (Optional, only if you import Teddy Bear monographs) `sql/teddy_bear_monographs.sql` + `sql/teddy_bear_monographs_seed.sql`.
5. **Create the storage buckets**:
   - `patient-images` — private, used by the patient-images feature.
   - `payment-screenshots` — used by the payment page. It must be **private** and the payment page uploads to it with the anon key (see payment section below).
6. **Create an admin** (this is unchanged — the "main user / administrator" identity is still whatever account you promote):
   - Sign up through the app, then promote by UUID in the SQL Editor:

   ```sql
   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = '<approved-user-uuid>';
   ```

   The admin Payment tab and the whole Admin Panel are gated by `profiles.role = 'admin'` (role-based, not a hardcoded email), so **your existing admin account keeps working as-is**.

---

## 2. Payment system (how it works + what to configure)

The payment system now mirrors **Kapoori-ka**: external wallet/bank payment → payment screenshot/transaction submission → admin verification → one-time activation code → in-app redemption.

### Flow

1. User opens **Subscription & Payment** in the app, taps **Buy Premium** → opens the hosted payment page (`public/payment.html`).
2. User pays via eSewa/Khalti/Fonepay/Bank, then submits name, email, transaction ID, amount, and an optional screenshot. The page inserts a `pending` row into `payments` anonymously.
3. Admin opens **Admin Panel → Payments**, reviews the transaction + screenshot, and **Approves** (or **Rejects** with a reason).
4. On Approve, the admin's browser generates a 12-character code, stores only its SHA-256 hash in `activation_codes`, and shows the plaintext code **once** (Copy / WhatsApp buttons).
5. User enters the code in the app (Subscription → Redeem). The `redeem_activation_code` RPC hashes the input, rate-limits attempts (5 per 15 min), and activates the subscription.

### Price

Single plan: **`full-access` — NPR 2,500 / year** (365 days). Defined in both `sql/subscriptions.sql` and the fallback in `src/pages/subscription/Subscription.jsx`. To change the price, update both places (and `public/payment.html`).

### Steps to configure

1. **Deploy the payment page** — `public/payment.html` must be hosted somewhere public (Netlify, Vercel, GitHub Pages, or any static host). Example (Netlify): drag the `public/` folder or run `npx netlify deploy --dir=public --prod`.
2. **Replace the Supabase placeholders** at the bottom of `public/payment.html`:

   ```js
   var SUPABASE_URL = '__SUPABASE_URL__';
   var SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
   ```

   → use the same Supabase project as the app.
3. **Create the `payment-screenshots` bucket** in Supabase Storage (private), and allow anon uploads to it with a storage policy, e.g.:

   ```sql
   -- Allow anyone to upload payment screenshots (they are just files, reviewed by admin)
   CREATE POLICY "payment_screenshots_anon_upload" ON storage.objects
     FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots');
   ```

   (Adapt to your institution's policy — the admin views screenshots via signed URLs generated with the admin's session.)
4. **Replace the QR code** `public/payment-qr.png` with your own eSewa/Khalti QR. If you don't add one, the image hides itself gracefully.
5. **Set the payment page URL** in `.env`:

   ```bash
   VITE_PAYMENT_WEB_URL=https://your-hosted-page.example/payment.html
   ```

6. **Update the WhatsApp number** in `public/payment.html` (the "WhatsApp Us" link) and in `src/pages/admin/PaymentAdmin.jsx` (the auto-generated WhatsApp message uses the customer's mobile number; the support number is only in `payment.html`).

> Live card/wallet charging (real eSewa/Khalti/Stripe API integration) still requires a licensed merchant account + a server-side integration with signed webhooks. This system is a **manual-verification** payment flow, exactly like Kapoori-ka, not an automated gateway.

---

## 3. Google OAuth (sign in with Google)

The app already has a "Sign in with Google" button wired in `src/context/AuthContext.jsx`. You only need to enable it in Google Cloud + Supabase.

### 3a. Google Cloud Console

1. Go to <https://console.cloud.google.com/apis/credentials>.
2. Create an **OAuth 2.0 Client ID** (type: Web application).
3. Add these **Authorized redirect URIs** (get the exact `...` from Supabase in step 3b):
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Note the **Client ID** and **Client Secret**.

### 3b. Supabase

1. **Authentication → Providers → Google**: enable it.
2. Paste the Google **Client ID** and **Client Secret**.
3. Copy the **redirect URL** Supabase shows, and paste it back into the Google Cloud Console's Authorized redirect URIs (step 3a).
4. For the Android/Capacitor build, also add the deep-link redirect:
   - The app uses `com.ourpicu.app://auth/callback` (see `src/context/AuthContext.jsx`, `DEEP_LINK`).
   - Add `com.ourpicu.app://auth/callback` to Supabase **Authentication → URL Configuration → Redirect URLs**.
5. Test: `npm run dev`, click **Sign in with Google**, complete the OAuth flow, and confirm a `profiles` row is created (the `handle_new_user` trigger in `sql/migration.sql` does this automatically).

---

## 4. Firebase (optional analytics only)

Firebase Analytics stays **disabled** until you provide config. `src/lib/analytics.js` already excludes PHI.

1. Create a project at <https://console.firebase.google.com>.
2. Add a **Web app** and copy the SDK config.
3. Fill `.env`:

   ```bash
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   VITE_FIREBASE_MEASUREMENT_ID=
   ```

4. Restart `npm run dev` / rebuild.
5. Keep all analytics events non-identifying (the adapter filters names/emails/IDs automatically). Get consent + privacy review before enabling in production.

---

## 5. Mobile app (Capacitor 8 / Android)

- **appId / applicationId:** `com.ourpicu.app`
- **appName:** `OurPICU`
- **webDir:** `dist`

```bash
npm run build
npx cap sync android
npx cap open android        # Android Studio
cd android && ./gradlew assembleDebug   # APK
```

Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
Release: configure a signing keystore, then `./gradlew assembleRelease`.

### If you actually meant Expo

This project is **not** an Expo app. Converting to Expo/React Native would be a separate project decision; the current Capacitor wrapper already produces an Android app from the same `dist/` build.

---

## 6. Verification checklist after your config

```bash
cd ~/Downloads/prakash-PICU
npm test        # 23/23
npm run build   # passes
npm run lint    # 0 errors
```
