# Put HariCart online (go live)

After these steps, residents open a link like `https://haricart.onrender.com` on their phones.
Plan for about **1–2 hours** the first time.

**You need:** a GitHub account (free), a Render account, your TiDB database (you already have it),
and a Firebase project for real SMS OTP.

> **Why Firebase is required:** on the live site the test code `1234` is switched off for safety.
> Without real SMS, nobody can log in — not even you.



## Step 1 — Real SMS OTP with Firebase (about 20 minutes)

1. Go to <https://console.firebase.google.com> → **Create a project** (name it `haricart`).
2. **Upgrade to the Blaze (pay-as-you-go) plan.** Since September 2024 Firebase sends phone-login
   SMS only on Blaze, so you must add a billing card. Each SMS costs roughly ₹1–6 depending on
   the country (check the Firebase pricing page). A 100-flat society usually costs very little.
   **Set a budget alert** (e.g. ₹500/month) in Google Cloud Billing so there are no surprises.
3. **Build → Authentication → Get started → Sign-in method → Phone → Enable → Save.**
4. **Project settings (gear icon) → General → Your apps → Web (`</>`)** → register an app named
   `haricart`. Copy these four values somewhere safe:
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID` **and** `FIREBASE_PROJECT_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`
5. Optional, for free testing: **Authentication → Sign-in method → Phone → Phone numbers for
   testing** → add your number with a fixed code (no SMS is sent, no cost).

You will come back to Firebase in Step 5 to add your live website address.

## Step 2 — Let the server reach your TiDB database (5 minutes)

1. Open <https://tidbcloud.com> → your `Haricart` database → **Networking**.
2. If **Public Endpoint** shows firewall rules with only your home IP, Render will be blocked.
   Either remove those rules (TiDB then accepts any IP; your password still protects it) or
   add the Render outbound IPs shown in Render → your service → **Connect → Outbound**.
3. **Reset your TiDB password** if it was ever shared (it was shown in a chat). Use one with only
   letters and numbers. Your link is:
   `mysql://USERNAME:PASSWORD@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/haricart`

## Step 3 — Put the code on GitHub (15 minutes)

The easiest way on a Mac is **GitHub Desktop**:

1. Install it from <https://desktop.github.com> and sign in.
2. **File → Add Local Repository →** choose your HariCart folder (the one with `package.json`).
   If it says "not a Git repository", click **create a repository**.
3. Check the file list: there must be **no `.env` file** and **no `node_modules`**
   (the project's `.gitignore` already hides them).
4. Write a summary like `First upload` → **Commit to main** → **Publish repository** →
   keep **"Keep this code private"** ticked → **Publish**.

## Step 4 — Create the website on Render (20 minutes)

1. Go to <https://render.com> → sign up with your GitHub account.
2. **New → Blueprint** → choose your `haricart` repository. Render reads `render.yaml` from the
   project and shows one service called **haricart**.
3. Fill in the values it asks for:

   | Setting | What to put |
   |---|---|
   | `DATABASE_URL` | your TiDB link from Step 2 |
   | `OWNER_PHONES` | your 10-digit mobile number |
   | `OWNER_SECRET_ID` | a private Owner ID you will remember |
   | `FIREBASE_PROJECT_ID` | Firebase `projectId` |
   | `VITE_FIREBASE_API_KEY` / `_AUTH_DOMAIN` / `_PROJECT_ID` / `_APP_ID` | the four Firebase values |
   | `VITE_PUBLIC_SITE_URL` | leave empty for now (you get the address after the first deploy) |
   | `OWNER_ALERT_PHONE` | optional — leave empty |

   `JWT_SECRET` is created for you automatically.
4. The plan is set to **Starter (about $7/month)**. You *can* pick **Free**, but a free site goes to
   sleep after 15 minutes with no visitors: the next customer waits about a minute, and the
   order alarm stops while it sleeps. For a real shop, use Starter.
5. Click **Apply / Deploy**. The first build takes 5–10 minutes. It installs everything, builds
   the site, and updates your database tables automatically.
6. When it says **Live**, open `https://YOUR-NAME.onrender.com/api/health`.
   You should see `{"ok":true,"db":"up",...}`.

## Step 5 — Finish the connection (5 minutes)

1. **Firebase → Authentication → Settings → Authorized domains → Add domain** →
   `YOUR-NAME.onrender.com` (without `https://`). Without this, the SMS step fails.
2. **Render → haricart → Environment** → set `VITE_PUBLIC_SITE_URL` to
   `https://YOUR-NAME.onrender.com` → **Save, rebuild and deploy**.
   (Website settings that start with `VITE_` are built into the site, so they need a rebuild.)

## Step 6 — Test before you tell residents

1. On your phone, open the live link → log in with **your owner number**. A real SMS arrives.
   (`1234` must **not** work.)
2. Create your Owner ID → **Admin** → add your real products with photos.
3. Tap the page once so the **order alarm** can ring. Keep this tab open on the shop phone.
4. On a second phone, log in as a customer → place a small Cash on Delivery order.
   The shop phone should ring within a few seconds.
5. Go through **Confirm → Mark packed → Send out → collect cash → Mark delivered**.
6. Try **Cancel** and **Out of stock** once so you know how they work.

## Step 7 — Invite residents

- In Admin, add residents to the **Invite list** if you want only invited numbers to join.
- Share the link (the **Share** button in the app) in the society WhatsApp group.
- On Android, residents can tap **⋮ → Add to Home screen** in Chrome to use HariCart like an app.

---

## Updating the live site later

Every time you change the code: open GitHub Desktop → write a summary → **Commit to main** →
**Push origin**. Render rebuilds and goes live automatically in a few minutes.

## If something goes wrong

| Problem | Fix |
|---|---|
| Build fails at `db:migrate` | `DATABASE_URL` is wrong, or TiDB Networking blocks Render (Step 2) |
| Server stops at start with "Missing or invalid required settings" | a required setting is empty — read the message, add it in Render → Environment |
| SMS never arrives | Firebase is not on Blaze, Phone sign-in is not enabled, or the Render domain is not in **Authorized domains** |
| "OTP service is not available" | the Firebase settings are missing in Render, or you changed `VITE_` values without **rebuild** |
| Site is slow the first time each morning | you are on the Free plan; switch to Starter |
| Owner screens don't appear | your number in `OWNER_PHONES` must match the number you log in with |
