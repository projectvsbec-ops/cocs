# Campus Operations Control System (COCS)

A modern, cloud-native web application for managing campus maintenance, tracking issues, and verifying work updates.

Built for **Admin** and **Manager** roles across 7 campus departments.

## 🚀 Tech Stack (Production Ready)

- **Frontend**: React (Vite) + Tailwind CSS
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Hosting**: Vercel (Frontend)

---

## 🛠️ Local Development Setup

### 1. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the script in `supabase-schema.sql`
3. Go to Storage and create a new public bucket named `photos`

### 2. Frontend Setup
1. Open the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` and add your Supabase Project URL and Anon Key.
5. Start the development server:
   ```bash
   npm run dev
   ```

---

## 🔐 Role-Based Access

| Feature | Admin | Manager |
|---------|:-----:|:-------:|
| Update Work | ✅ | ✅ |
| Report Issue | ✅ | ✅ |
| View My Tasks | ✅ | ✅ |
| Verify Work | ✅ | ✅ (own dept) |
| Dashboard | ✅ | ❌ |
| Audits | ✅ | ❌ |

---

## 🔑 Demo Accounts

The SQL schema automatically sets up the following Demo user (assuming you create them in Supabase Auth via email/password):

* **Admin**: `admin@cocs.com`
* **Electrical Manager**: `elec.mgr@cocs.com`

**Important Note on Authentication:**
Because this system uses Supabase Auth, you must manually create these demo users in the Supabase Dashboard -> Authentication -> Add User. The SQL Trigger defined in the schema will automatically add them to the `profiles` table with a default role of `Manager`. To make the Admin user an admin, you must manually change their role to `Admin` in the `profiles` table.

---

## ☁️ Deployment (Vercel)

This application is designed to be hosted directly from the `client/` folder as a static React Single Page Application (SPA).

1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com).
3. Import your repository.
4. Set the **Framework Preset** to Vite.
5. Set the **Root Directory** to `client`.
6. Add the following **Environment Variables** in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Click **Deploy**.

---

## 📸 Storage Management

All photos uploaded during Work Updates and Issue Reporting are stored securely in Supabase Storage (`photos` bucket). The database stores the public URL to retrieve the image. Ensure your Supabase Storage bucket policy allows public reads.
