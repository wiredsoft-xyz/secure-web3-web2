import * as trpcNode from "@trpc/server/adapters/standalone";
import { Auth } from "../utils/auth";

interface CreateContextOptions {
  user?: string | null;
}

export async function createContextInner(_opts: CreateContextOptions) {
  return { user: null };
}

export async function createContext({
  req,
  res,
}: trpcNode.CreateHTTPContextOptions) {
  // Create your context based on the request object
  // Will be available as `ctx` in all your resolvers
  // This is just an example of something you might want to do in your ctx fn
  async function getUserFromHeader() {
    if (req.headers.authorization) {
      const user = await Auth.Jwt.decodeAndVerify(
        "access",
        req.headers.authorization.split(" ")[1]
      );
      return user;
    }
    return null;
  }
  const user = await getUserFromHeader();
  return {
    user,
  };
}
export type Context = Awaited<ReturnType<typeof createContext>>;
