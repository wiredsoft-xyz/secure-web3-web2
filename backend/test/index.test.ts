import { testClient } from "hono/testing";
import assert from "node:assert";
import { it } from "node:test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import server from "../src/server.js";

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);
const TestClient = testClient(server);

it("Returns 'Hello Hono!'.", async () => {
  const res = await TestClient.index.$get();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(await res.text(), "Hello Hono!");
});

it("Creates a new challenge to be signed.", async () => {
  const res = await TestClient.challenge.$post({
    json: {
      address: account.address,
    },
  });
  const data = await res.json();

  assert.strictEqual(res.status, 200);
  assert("challengeMessage" in data);
});

it("Signs a challenge.", async () => {
  const createChallengeRes = await TestClient.challenge.$post({
    json: {
      address: account.address,
    },
  });
  const { challengeMessage } = await createChallengeRes.json();

  const signature = await account.signMessage({ message: challengeMessage });

  const signChallengeRes = await TestClient.challenge.sign.$post({
    json: {
      challenge: challengeMessage,
      signature: signature,
    },
  });

  const data = await signChallengeRes.json();

  assert.strictEqual(signChallengeRes.status, 200);
  assert("access_token" in data);
  assert("refresh_token" in data);
});

it("Signs an unexisting challenge.", async () => {
  const challengeMessage = "šālōm";

  const signature = await account.signMessage({ message: challengeMessage });

  const signChallengeRes = await TestClient.challenge.sign.$post({
    json: {
      challenge: challengeMessage,
      signature: signature,
    },
  });

  const data = await signChallengeRes.json();

  assert.strictEqual(signChallengeRes.status, 404);
  assert("error" in data);
  assert.strictEqual(data.error, "Challenge not found.");
});

it("Fails to sign an expired challenge.", async () => {
  const createChallengeRes = await TestClient.challenge.$post(
    {
      json: {
        address: account.address,
      },
    },
    {}
  );
  const { challengeMessage } = await createChallengeRes.json();

  // default expire time when TEST=true is 0.05.
  await new Promise((r) => setTimeout(r, 60));

  const signature = await account.signMessage({ message: challengeMessage });

  const signChallengeRes = await TestClient.challenge.sign.$post({
    json: {
      challenge: challengeMessage,
      signature: signature,
    },
  });

  const data = await signChallengeRes.json();

  assert.strictEqual(signChallengeRes.status, 410);
  assert("error" in data);
  assert.strictEqual(data.error, "Challenge expired.");
});
