# CM4-302 · Electricity Bill Settlement

Same look as the original calculator, different logic: **pay as you go, settle the AC difference at month end.**

## How it works
1. Everyone puts in an equal amount for every recharge (e.g. ₹1,500 = ₹500 each). Add each recharge in the app any day, as many times as needed in a month.
2. Common usage (lights, fridge, WiFi...) is shared equally, so it cancels out. Only the three **AC meters** matter.
3. On the **last day of the month** enter the three AC readings. For each person: `AC cost = (closing − opening) × rate`.
4. The total AC cost is split equally. Whoever used less than the equal share **gets** money, whoever used more **pays**, and the app shows **who pays whom** (fewest transfers).

Example: Shagun ₹1,000, Saumya ₹0, Muskan ₹2,000 → total ₹3,000, equal share ₹1,000 → **Muskan pays Saumya ₹1,000**.

No prediction and no next-month recharge amount: pay, use, settle.

## Run (ports differ from the original app, so both can run together)
```bash
cd backend  && npm install && npm run dev   # http://localhost:4100
cd frontend && npm install && npm run dev   # http://localhost:5174
```

## Features (same as the original)
- Splash screen, calendar of settled months, click a month for the full breakdown.
- **Onboarding:** until the very first AC readings are saved, entry is open on any day. They become the starting point; nothing is settled that day.
- **Anti-cheat:** the server clock decides "today"; AC readings are accepted only on the last day of the month. A saved settlement is locked.
- **Admin** (top-right, 6-digit PIN): Real/Test mode, force-unlock the latest unsettled month, reset the latest settlement (or the starting readings), remove a wrong recharge, change the unit price (applies from next month), change the PIN. Every reset is logged.
- **Test mode** shows sample settlements and recharges for the last 3 months and accepts entries on any day. Real and test data are stored separately.

## Config (`backend/.env`, see `.env.example`)
| Variable | Meaning |
|---|---|
| `MONGODB_URI` | Empty = local files in `backend/data/`. Paste your Atlas URL to use MongoDB. |
| `ADMIN_PIN` | Starting admin PIN (6 digits). Change it before deploying. |
| `RATE_PER_UNIT` | Starting price per unit (admin can schedule changes from next month). |
| `RECHARGE_AMOUNT` | Pre-filled recharge amount (default 1500). |
| `START_MONTH` | First month tracked (`2026-10`). |
| `CORS_ORIGIN` | Frontend URL (`http://localhost:5174` locally). |
| `ADMIN_TOKEN_SECRET` | Optional, signs admin sessions. |
| `TIMEZONE` | Decides which day is the last day (`Asia/Kolkata`). |

## Deploying
Same as the original: backend on Render (root `backend`, `npm start`), frontend on Vercel (root `frontend`, env `VITE_API_URL=https://<backend>/api`), then set `CORS_ORIGIN` to the Vercel URL. Add `MONGODB_URI`, a new `ADMIN_PIN` and `ADMIN_TOKEN_SECRET` on Render.
