import server from "./server";
import env from "./utils/env";

server.listen(env.PORT, () => {
  console.log("Server started on http://localhost:3000");
});
