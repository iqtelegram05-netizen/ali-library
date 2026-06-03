import { handlers } from '@/lib/auth';

/* ===================================================================
   Auth.js v5 App Router route handler.
   Replaces the v4 workaround that wrapped Web API Request objects
   into Node.js IncomingMessage — which caused 500 errors during
   OAuth callbacks.
   =================================================================== */

export const { GET, POST } = handlers;
