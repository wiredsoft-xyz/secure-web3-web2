import { initTRPC, TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { generateOpenApiDocument, OpenApiMeta } from "trpc-to-openapi";
import { verifyMessage } from "viem";
import { z } from "zod";
import { extendZodWithOpenApi } from "zod-openapi";
import { Auth } from "../utils/auth";
import {
  ChallengeStore,
  getChallengeMsg,
  IChallenge,
} from "../utils/ChallengeStore";
import env from "../utils/env";
import { Context } from "./context";

extendZodWithOpenApi(z);

const t = initTRPC.meta<OpenApiMeta>().context<Context>().create();

const publicProcedure = t.procedure;
const router = t.router;

export const appRouter = router({
  greeting: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/greeting",
      },
    })
    .input(z.undefined())
    .output(z.string())
    .query(() => {
      // This is what you're returning to your client
      return "hello world";
    }),
  challenge: router({
    create: publicProcedure
      .meta({
        openapi: {
          method: "POST",
          path: "/challenge/create",
        },
      })
      .input(
        z.object({
          address: z.string().nonempty(),
        })
      )
      .output(z.object({ challengeMessage: z.string() }))
      .mutation(async (opts) => {
        const { input } = opts;

        // generate a random hex string
        const challengeHex = randomBytes(16).toString("hex");

        // generate the challenge message
        const challengeMessage = getChallengeMsg(input.address, challengeHex);

        // create the new challenge instance
        const challenge: IChallenge = {
          address: input.address,
          challengeHex: challengeHex,
          createdAt: new Date().toUTCString(),
        };

        // temporarily persist the challenge,
        // in a real production setting
        // you'd likely use redis or memcached,
        // but in-memory is perfectly
        // fine for most cases.
        ChallengeStore.set(challengeMessage, challenge);

        return { challengeMessage };
      }),
    sign: publicProcedure
      .meta({
        openapi: {
          method: "POST",
          path: "/challenge/sign",
        },
      })
      .output(z.object({ access_token: z.string(), refresh_token: z.string() }))
      .input(
        z.object({
          challenge: z.string().nonempty(),
          signature: z.string().nonempty(),
        })
      )
      .mutation(async (opts) => {
        const { input } = opts;
        const { challenge, signature } = input;

        // retrieve challenge from ChallengeStore
        const challengeData = ChallengeStore.get(challenge);
        if (!challengeData)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Challenge not found.",
          });

        // check if the challenge is still valid
        if (
          Date.now() - new Date(challengeData.createdAt).getTime() >
          env.CHALLENGE_EXP_SECONDS * 1000
        ) {
          // in a prod setting this would happen automatically.
          ChallengeStore.delete(challenge);
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Challenge expired.",
          });
        }

        const isValid = await verifyMessage({
          address: challengeData.address as `0x${string}`,
          message: challenge,
          signature: signature as `0x${string}`,
        });

        if (!isValid)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Signature.",
          });

        const tokens = await Auth.Jwt.createTokensFor(challengeData.address);

        return tokens;
      }),
  }),
});

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: "dApp Backend OpenAPI",
  version: "1.0.0",
  baseUrl: `http://localhost:${env.PORT}/api`,
  docsUrl: `http://localhost:${env.PORT}/docs`,
});

export const createCaller = t.createCallerFactory(appRouter);

// export only the type definition of the API
// None of the actual implementation is exposed to the client
export type AppRouter = typeof appRouter;
