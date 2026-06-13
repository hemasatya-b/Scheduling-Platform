import { createApp } from '../src/app';

// Vercel serverless entry point — the Express app is reused as the request
// handler for every function invocation.
export default createApp();
