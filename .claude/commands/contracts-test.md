# Run Contract Tests

Run all smart contract tests.

## Tasks

1. Run `cd contracts && forge test -vv`
2. Output test result summary
3. Analyze details if any tests fail

## Options

If the user wants to run specific tests only:
- `--match-contract ContractName` - Run tests for a specific contract only
- `--match-test test_FunctionName` - Run a specific test function only
- `-vvv` - More verbose output
