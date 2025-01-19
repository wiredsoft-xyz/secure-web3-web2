import { serve } from "@hono/node-server";
import server from "./server.js";

const port = Number(process.env.PORT) || 3000;
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: server.fetch,
  port,
});
