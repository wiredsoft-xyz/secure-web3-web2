import { inferProcedureInput } from "@trpc/server";
import { ok } from "node:assert";
import { it } from "node:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createContextInner } from "../src/trpc/context";
import { AppRouter, createCaller } from "../src/trpc/trpc";

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

it("Greets", async () => {
  const ctx = await createContextInner({});
  const caller = createCaller(ctx);

  const greeting = await caller.greeting();

  ok(greeting === "hello world");
});

it("Creates a challenge", async () => {
  const ctx = await createContextInner({});
  const caller = createCaller(ctx);

  const input: inferProcedureInput<AppRouter["challenge"]["create"]> = {
    address: account.address,
  };

  const challenge = await caller.challenge.create(input);

  ok("challengeMessage" in challenge, "challengeMessage not in data");
  ok(
    challenge.challengeMessage.startsWith(
      `Sign this message to verify your Ethereum address ${input.address}: `
    ),
    "challengeMessage is incorrectly formatted"
  );
});

it("Creates a challenge and signs it", async () => {
  const ctx = await createContextInner({});
  const caller = createCaller(ctx);

  const input: inferProcedureInput<AppRouter["challenge"]["create"]> = {
    address: account.address,
  };

  const { challengeMessage } = await caller.challenge.create(input);

  const signature = await account.signMessage({ message: challengeMessage });

  const tokenPair = await caller.challenge.sign({
    challenge: challengeMessage,
    signature,
  });

  ok("access_token" in tokenPair);
  ok("refresh_token" in tokenPair);
});

it("Fails to Sign an unexisting challenge", async () => {
  const ctx = await createContextInner({});
  const caller = createCaller(ctx);

  const challengeMessage = "shalom";

  const signature = await account.signMessage({ message: challengeMessage });

  await caller.challenge
    .sign({
      challenge: challengeMessage,
      signature,
    })
    .catch((e) => {
      ok(e.code === "NOT_FOUND");
    });
});

it("Fails to Sign an expired challenge", async () => {
  const ctx = await createContextInner({});
  const caller = createCaller(ctx);

  const input: inferProcedureInput<AppRouter["challenge"]["create"]> = {
    address: account.address,
  };

  const { challengeMessage } = await caller.challenge.create(input);

  const signature = await account.signMessage({ message: challengeMessage });

  await new Promise((r) => setTimeout(r, 60));

  await caller.challenge
    .sign({
      challenge: challengeMessage,
      signature,
    })
    .catch((e) => {
      ok(e.code === "PRECONDITION_FAILED");
    });
});
