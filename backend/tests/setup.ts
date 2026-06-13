import path from 'path';
import dotenv from 'dotenv';

// Load test env vars first. `src/config/env.ts` also calls `dotenv/config`
// (which loads `.env`), but dotenv never overrides variables that are
// already present in process.env — so these values win.
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
