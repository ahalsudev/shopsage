# ShopSage Solana Programs

This repository contains three Solana programs for the ShopSage platform:

- `shopsage-expert`: Manages expert registration and rating.
- `shopsage-payment`: Handles consultation payments and commission distribution.
- `shopsage-session`: Manages consultation sessions between experts and shoppers.

## Programs Overview

### `shopsage-expert`

This program allows experts to register on the platform, update their online status, and receive ratings from shoppers.

**Instructions:**
- `register_expert`: Registers a new expert with their name, specialization, and session rate.
- `update_expert_status`: Updates the online status of an expert.
- `update_expert_rating`: Allows a shopper to rate an expert after a consultation.

### `shopsage-payment`

This program facilitates payments for consultations, distributing 80% of the fee to the expert and 20% to the platform.

**Instructions:**
- `initialize_payment`: Initializes a payment account for the platform.
- `process_consultation_payment`: Processes the payment for a consultation, transferring SOL to the expert and the platform.

### `shopsage-session`

This program manages the lifecycle of consultation sessions, from creation to completion or cancellation.

**Instructions:**
- `create_session`: Creates a new consultation session with a unique ID, expert, shopper, and amount.
- `start_session`: Marks a pending session as active.
- `end_session`: Marks an active session as completed.
- `cancel_session`: Cancels a pending session.

## Running Tests

To run the tests for all programs, ensure you have a local Solana test validator running. If not, you can start one in the background:

```bash
solana-test-validator &
```

Then, you can run the tests using the Anchor CLI:

```bash
anchor test
```

This command will:
1. Clean the build artifacts.
2. Build all programs.
3. Deploy the programs to your local validator.
4. Run the TypeScript tests located in the `tests/` directory.

## Troubleshooting

- **`Error: Account ... has insufficient funds for spend`**: This usually means your wallet or a test account doesn't have enough SOL. Ensure your local validator is running and healthy. The tests automatically airdrop SOL to necessary accounts.
- **`Error: Your configured rpc port: 8899 is already in use`**: This means another process (likely a previous `solana-test-validator` instance) is using the RPC port. Find and kill the process using `lsof -i :8899` and then `kill <PID>`.
- **`DeclaredProgramIdMismatch`**: This indicates a mismatch between the program ID in your `Anchor.toml` or test files and the deployed program. Running `anchor clean && anchor build && anchor test` should resolve this by redeploying and updating the IDLs.