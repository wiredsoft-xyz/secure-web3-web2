import { zValidator } from "@hono/zod-validator";
import { randomBytes } from "crypto";
import { Hono } from "hono";
import jwt from "jsonwebtoken";
import { verifyMessage } from "viem";
import { z } from "zod";

interface IChallenge {
  address: string;
  challengeHex: string;
  createdAt: string;
}

const CHALLENGE_EXP_SECONDS = process.env.TEST
  ? 0.05
  : Number(process.env.CHALLENGE_EXP_SECONDS) || 60;
const JWT_AT_SECRET_KEY = process.env.JWT_AT_SECRET_KEY || "atsecretkey!";
const JWT_RT_SECRET_KEY = process.env.JWT_RT_SECRET_KEY || "rtsecretkey!";

// in prod you'd use redis or memcached for this,
// though in-memory is perfectly fine for most cases.
const ChallengeStore = new Map<string, IChallenge>();

const getChallengeMsg = (address: string, challenge: string) =>
  `Sign this message to verify your Ethereum address ${address}: ${challenge}`;

const server = new Hono()
  .post(
    "/challenge",
    zValidator(
      "json",
      z.object({
        address: z.string(),
      })
    ),
    async (ctx) => {
      // retrieve user address
      const { address } = ctx.req.valid("json");

      // generate a random hex string
      const challengeHex = randomBytes(16).toString("hex");

      // generate the challenge message
      const challengeMessage = getChallengeMsg(address, challengeHex);

      // create the new challenge instance
      const challenge: IChallenge = {
        address,
        challengeHex: challengeHex,
        createdAt: new Date().toISOString(),
      };

      // temporarily persist the challenge,
      // in a real production setting
      // you'd likely use redis or memcached,
      // but in-memory is perfectly
      // fine for most cases.
      ChallengeStore.set(challengeMessage, challenge);

      return ctx.json({ challengeMessage }, 200);
    }
  )
  .post(
    "/challenge/sign",
    zValidator(
      "json", // validate incoming body
      z.object({
        challenge: z.string(),
        signature: z.string(),
      })
    ),
    async (ctx) => {
      // retrieve user address
      const { challenge, signature } = ctx.req.valid("json");

      // retrieve challenge from ChallengeStore
      const challengeData = ChallengeStore.get(challenge);
      if (!challengeData)
        return ctx.json({ error: "Challenge not found." }, 404);

      // check if the challenge is still valid
      if (
        Date.now() - new Date(challengeData.createdAt).getTime() >
        CHALLENGE_EXP_SECONDS * 1000
      ) {
        // in a prod setting this would happen automatically.
        ChallengeStore.delete(challenge);
        return ctx.json(
          {
            error: "Challenge expired.",
          },
          410
        );
      }

      const isValid = await verifyMessage({
        address: challengeData.address as `0x${string}`,
        message: challenge,
        signature: signature as `0x${string}`,
      });

      if (!isValid) return ctx.json({ error: "Invalid Signature" }, 400);

      const access_token = jwt.sign(
        { sub: challengeData.address },
        JWT_AT_SECRET_KEY,
        {
          expiresIn: "1h",
        }
      );

      const refresh_token = jwt.sign(
        { sub: challengeData.address },
        JWT_RT_SECRET_KEY,
        {
          expiresIn: "24h",
        }
      );

      return ctx.json({ access_token, refresh_token }, 200);
    }
  )
  .get(
    "/protected",
    zValidator(
      "header",
      z.object({
        Authorization: z.string(),
      })
    ),
    (ctx) => {
      const token = ctx.req.valid("header").Authorization.split("Bearer ")[-1];

      try {
        const decoded = jwt.verify(token, JWT_AT_SECRET_KEY);

        const address = decoded.sub;

        return ctx.text(`Welcome, ${address}`, 200);
      } catch (e) {
        return ctx.text("Unauthorized", 401);
      }
    }
  )
  .get("/", (c) => {
    return c.text("Hello Hono!");
  });

export default server;
