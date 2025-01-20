export interface IChallenge {
  address: string;
  challengeHex: string;
  createdAt: string;
}

// in prod you'd use redis or memcached for this,
// though in-memory is perfectly fine for most cases.
export const ChallengeStore = new Map<string, IChallenge>();

// utility for generating the messages
export const getChallengeMsg = (address: string, challenge: string) =>
  `Sign this message to verify your Ethereum address ${address}: ${challenge}`;
