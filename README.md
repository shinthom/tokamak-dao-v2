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

In the local environment, the Voting Delay, Voting Period, and Timelock Delay are each set to **1 hour** (300 blocks) instead of the production defaults of **1 day / 7 days / 7 days**.

1. Create a proposal, then skip the Voting Delay (1 hour) to begin voting:

    ```
    npm run time-travel -- 1h
    ```

2. Cast your vote in the UI (For / Against / Abstain).
3. Skip the Voting Period (1 hour) to close voting:

    ```
    npm run time-travel -- 1h
    ```

4. Queue the proposal, then skip the Timelock Delay (1 hour):

    ```
    npm run time-travel -- 1h
    ```

5. Execute the proposal.

## Specification

You can find the specification [here](./docs/specs/README.md).
