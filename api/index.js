// Vercel serverless entry point. vercel.json rewrites every /api/* request here, and the
// same Express app that runs locally handles it (req.url keeps the original /api/... path).
// backend/dist is compiled during the Vercel build (npm run build:vercel in backend/).
import { createApp } from '../backend/dist/app.js';

export default createApp();
