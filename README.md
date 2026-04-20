# 🏆 Zabardast Awards

> Quarterly employee recognition platform for R&D teams
> Built with React + Vite + Tailwind CSS + Supabase + Vercel

---

## ✨ Features

| Role | Access |
|------|--------|
| **Manager** | Submit nominations for team members |
| **HOD** | Review, approve, or reject nominations with comments |
| **Admin** | Dashboard, settings, user management, CSV export |

---

## 🚀 Step-by-Step Deployment

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name, set a strong DB password, pick the closest region
3. Wait for the project to provision (~1 min)

### Step 2 — Run SQL Scripts

1. Open your project → **SQL Editor** → **New query**
2. Paste and run each script **in order**:
   - `scripts/01-create-tables.sql` → creates the 3 tables
   - `scripts/02-seed-data.sql` → seeds default users + settings
   - `scripts/03-rls-policies.sql` → enables RLS with open policies
3. Verify in **Table Editor** that `nominations`, `app_users`, `app_settings` tables exist

### Step 3 — Get Supabase Credentials

1. Supabase dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon public** key

### Step 4 — Local Development

```bash
# Clone or copy the project
cd zabardast-awards

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
# Edit .env.local and add your Supabase URL and key

# Start dev server
npm run dev
```

Open `http://localhost:5173`

### Step 5 — Push to GitHub

```bash
git init
git add .
git commit -m "feat: initial Zabardast Awards app"
git remote add origin https://github.com/YOUR_USERNAME/zabardast-awards.git
git push -u origin main
```

### Step 6 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Framework preset: **Vite** (auto-detected)
4. **Environment Variables** → add:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
5. Click **Deploy** 🚀

---

## 🔑 Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Manager | `manager1` | `manager@123` |
| HOD | `hod1` | `hod@123` |
| Admin | `admin1` | `admin@123` |

Change these via **Settings → Manage Users** after first login.

---

## 📁 Project Structure

```
zabardast-awards/
├── public/
├── scripts/
│   ├── 01-create-tables.sql
│   ├── 02-seed-data.sql
│   └── 03-rls-policies.sql
├── src/
│   ├── contexts/
│   │   ├── AuthContext.jsx     # Auth + settings state
│   │   └── ToastContext.jsx    # Toast notifications
│   ├── components/
│   │   └── Header.jsx
│   ├── lib/
│   │   └── supabase.js
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx       # Admin: stats + carousel
│   │   ├── Nominations.jsx     # Manager: submit form
│   │   ├── HodReview.jsx       # HOD: inline review table
│   │   ├── Settings.jsx        # Admin: settings + users + SQL
│   │   └── Download.jsx        # Admin: CSV export
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.local.example
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── tailwind.config.js
└── postcss.config.js
```

---

## 🛡️ Security Note

Passwords are stored as plain text in this internal tool.
For production use, integrate Supabase Auth or a proper hashing library (e.g. bcrypt via Edge Functions).

---

## 🎨 Design Tokens

- **Primary**: `#E8520A` (orange)
- **Background**: `#FDF8F4` (warm cream)
- **Approved**: green · **Pending**: amber · **Rejected**: red
