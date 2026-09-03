# Updates

## Deployment fix
- Converted the original `dispatch.jsx` (built for Claude's artifact environment) into a standalone Vite project so it can run on Vercel.
- Added `index.html` as the entry point, referencing `/main.jsx`.
- Added `main.jsx` to mount the `Dispatch` component into the page.
- Replaced the Claude-only `window.storage` persistent storage calls with the browser's built-in `localStorage`, so data now saves per-device instead of relying on Claude's artifact API (which doesn't exist outside Claude).
- Added `package.json` and `vite.config.js` so Vercel can install dependencies and build the project automatically.

## Notes
- Because storage is now `localStorage`, order data is local to each browser/device — it won't sync between a customer's phone and a driver's phone. Let me know if you want real shared storage (e.g. a small backend or hosted database) instead.
