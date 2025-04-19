# Welcome to SubletNU!

## Project info
As a student, finding reliable sublets can be difficult and cumbersome. There are lots of factors to consider when choosing the right one: price, distance from university, length of your stay, etc. SubletNU simplifies this by only allowing student-to-student connections and making it easy to see all the relevant information that you need to make a decision. 

## How can I edit this code?

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <THIS_PROJECT_URL>

# Step 2: Navigate to the project directory.
cd subletNU

# Step 3: Install the necessary dependencies.
npm install

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Security Items

- Input validation (frontend + backend/DB)
- Rate limiting (can be revisited if needed)
- CORS setup (production-only)
- HTTPS only (handled by Vercel/Supabase)
- Auth (CAPTCHA, RLS, etc.)
- Data (SQL injection, constraints, backups)
- Frontend (no secrets, XSS, lazy loading, etc.)
