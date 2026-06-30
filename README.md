# Anime Tracker

A simple, private anime tracker for a small group (up to 5 users). Each person logs in and tracks their own anime across three lists: **Watching**, **Finished**, and **Plan to Watch**.

Built with plain HTML, CSS, and JavaScript on the frontend, and [Supabase](https://supabase.com) (a hosted Postgres database with built-in authentication) on the backend. No build tools, no frameworks — just files you can open in a browser or deploy anywhere static sites are hosted.

---

## 1. Folder structure

```
anime-tracker/
├── index.html              # Login page
├── dashboard.html          # Main dashboard (protected — requires login)
├── schema.sql               # Database schema to run in Supabase
├── README.md                 # This file
├── css/
│   └── style.css            # All styling (shared by both pages)
└── js/
    ├── supabase-config.js   # Your Supabase URL + anon key go here
    ├── toast.js              # Small success/error notification helper
    ├── auth.js                # Login logic (index.html)
    └── app.js                 # Dashboard logic: load, add, edit, delete anime
```

---

## 2. How each part works

- **`index.html` + `js/auth.js`** — A login form that calls Supabase's `signInWithPassword`. On success, the browser is redirected to `dashboard.html`. If a valid session already exists, the user skips straight to the dashboard.
- **`dashboard.html` + `js/app.js`** — On load, it checks for a valid Supabase session (redirecting back to login if there isn't one), then fetches every row in the `anime` table that belongs to the logged-in user and renders it into the Watching / Finished / Plan to Watch columns. Adding, editing, and deleting anime all talk directly to Supabase from the browser using the Supabase JS client.
- **`schema.sql`** — Defines the `anime` table and Row Level Security (RLS) policies. RLS is what actually enforces privacy: even though all users share one table, Postgres only ever returns or accepts rows where `user_id` matches the currently logged-in user.
- **`css/style.css`** — One shared stylesheet for the dark purple theme, cards, modals, and responsive layout.

No custom backend server is required — Supabase's hosted API + database handles authentication and storage directly from the static frontend.

---

## 3. Database setup (Supabase)

1. Create a free account at [supabase.com](https://supabase.com) and create a new project.
2. Once the project is ready, open **SQL Editor** in the left sidebar, click **New query**, paste the contents of `schema.sql`, and click **Run**. This creates the `anime` table and the security policies that keep each user's data private.
3. Open **Authentication → Providers** and confirm **Email** sign-in is enabled (it is by default).
4. Create accounts for your group (up to 5 people), using one of these approaches:
   - **Recommended for a private group:** Go to **Authentication → Users → Add user** and manually create an account (email + password) for each person. This way sign-ups stay closed and only your group can log in.
   - **Alternative:** Temporarily enable public sign-ups, have each person register through a sign-up form, then disable sign-ups again so no one else can join later.
5. Open **Settings → API**. You'll need two values from this page in the next step:
   - **Project URL**
   - **anon public key**

---

## 4. Connect the app to your database

Open `js/supabase-config.js` and replace the placeholder values:

```js
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

with the **Project URL** and **anon public key** you copied from Supabase Settings → API. These are safe to keep in frontend code — the Row Level Security policies from `schema.sql` are what actually keep everyone's data private, not secrecy of this key.

There are no other environment variables or build steps needed — this is a static site.

---

## 5. Run it locally

Since the app makes real network requests to Supabase, it's best served over `http://` rather than opened directly as a `file://` path. Any simple local server works, for example:

```bash
# Python 3
python -m http.server 5500

# or, with Node installed
npx serve .
```

Then visit `http://localhost:5500` (or whatever port your tool prints) in your browser.

---

## 6. Deploy it

### Option A: Netlify (recommended, free)

1. Push this folder to a new GitHub repository.
2. Go to [netlify.com](https://netlify.com) → **Add new site → Import an existing project**.
3. Connect your GitHub account and select the repository.
4. Build settings: leave **Build command** empty and set **Publish directory** to the project root (`.`) since this is a static site with no build step.
5. Click **Deploy site**. Netlify will give you a live URL you can share with your group.

### Option B: GitHub Pages

1. Push this folder to a GitHub repository.
2. Go to the repo's **Settings → Pages**.
3. Under **Source**, choose the branch (e.g. `main`) and root folder, then save.
4. GitHub will publish the site at `https://<your-username>.github.io/<repo-name>/`.

Either way, no environment variables need to be configured on the host — the Supabase URL and key already live in `js/supabase-config.js`.

---

## 7. Using the app

1. Open the deployed link (or `index.html` locally) and log in with the email/password an admin created in Supabase.
2. On the dashboard, use the **+** floating button to add a new anime — fill in the name, season, status, current episode (only shown when status is "Watching"), and optional notes.
3. Use the pencil icon on any card to edit it, or the trash icon to delete it (you'll be asked to confirm).
4. Use the search bar to filter by title, or the dropdown to filter by status.
5. Click **Logout** in the top bar to end your session.

---

## 8. Extending later

The schema and code are intentionally simple so it's easy to add more later, for example:
- A star rating column on the `anime` table + a rating UI on the cards.
- An episode progress bar (`current_episode` / total episodes).
- A "friend activity" feed by relaxing the RLS `select` policy to allow viewing (but not editing) other group members' lists.
