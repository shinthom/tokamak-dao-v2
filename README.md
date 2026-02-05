# Tokamak DAO v2

Tokamak Network DAO governance system.

## Local Development

```bash
# Install dependencies
npm install

# Terminal 1: Start local blockchain
npm run anvil

# Terminal 2: Deploy contracts & start webapp
npm run contracts:deploy:local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with MetaMask (Chain ID: `1337`).

### Testing Proposals (Time Travel)

In the local environment, the Voting Period is set to **1 day** (7,200 blocks) instead of the production default of **7 days**. The Voting Delay is also **1 day** (7,200 blocks).

# 1. Create a proposal, then skip the Voting Delay (1 day) so voting can begin
npm run time-travel -- 1d

# 2. Cast your vote in the UI (For / Against / Abstain)

# 3. Skip the Voting Period (1 day) to close voting
npm run time-travel -- 1d

# 4. Queue and Execute the proposal
```

## Specification

You can find the specification [here](./docs/specs/README.md).
