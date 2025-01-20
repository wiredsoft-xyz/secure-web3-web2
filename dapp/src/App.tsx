import { useCallback } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";

function App() {
  const account = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();

  const requestWeb2Session = useCallback(async () => {
    const challengeRes = await fetch(
      "http://localhost:3000/api/challenge/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: account.address }),
      }
    );

    const challengeData = await challengeRes.json();

    const signature = await signMessageAsync({
      account: account.address,
      message: challengeData.challengeMessage,
    });

    const authRes = await fetch("http://localhost:3000/api/challenge/sign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        challenge: challengeData.challengeMessage,
        signature,
      }),
    });

    const authData = await authRes.json();

    console.log(authData);

    window.alert(JSON.stringify(authData, null, 2));
  }, [account, signMessageAsync]);

  return (
    <>
      <div>
        <h2>Account</h2>

        <div>
          status: {account.status}
          <br />
          addresses: {JSON.stringify(account.addresses)}
          <br />
          chainId: {account.chainId}
        </div>

        {account.status === "connected" && (
          <div>
            <button type="button" onClick={() => requestWeb2Session()}>
              Request Web2 Session
            </button>
            <hr />
            <button type="button" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      <div>
        <h2>Connect</h2>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            type="button"
          >
            {connector.name}
          </button>
        ))}
        <div>{status}</div>
        <div>{error?.message}</div>
      </div>
    </>
  );
}

export default App;
