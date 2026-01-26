# Tokamak Network DAO Governance Contracts

vTON DAO 거버넌스 스마트 컨트랙트 - Foundry 기반

## Overview

본 프로젝트는 Tokamak Network의 DAO 거버넌스 모델을 구현합니다. 핵심 설계 원칙:

- **TON과 vTON의 역할 분리**: TON은 경제적 유틸리티, vTON은 거버넌스 투표권
- **투표권 집중 방지**: 위임 상한 20%, 7일 위임 기간 요건
- **Security Council**: 긴급 상황 대응을 위한 다중서명 체계

## Contracts

### Token
- **vTON** (`src/token/vTON.sol`): 거버넌스 토큰
  - 무한 발행 (시뇨리지 기반)
  - 거래 가능 (Tradeable)
  - 투표 시 소각되지 않음 (Not-burnable)

### Governance
- **DelegateRegistry** (`src/governance/DelegateRegistry.sol`): 위임 관리
  - Delegator 등록 (프로필, 투표 철학, 이해관계 공시)
  - vTON 위임/철회/재위임
  - 위임 상한 20% 적용
  - 7일 위임 기간 요건

- **DAOGovernor** (`src/governance/DAOGovernor.sol`): 거버넌스 메인 컨트랙트
  - 제안 생성 (100 TON 소각)
  - 투표 (찬성/반대/기권)
  - 정족수 4%, 과반수 가결
  - 7일 투표 기간, 7일 Timelock

- **SecurityCouncil** (`src/governance/SecurityCouncil.sol`): 보안 위원회
  - 초기 3명 (재단 1명 + 외부 2명)
  - 2/3 임계값
  - 악의적 제안 취소, 긴급 업그레이드, 프로토콜 일시정지

- **Timelock** (`src/governance/Timelock.sol`): 실행 지연
  - 7일 기본 지연
  - Security Council 취소 권한

## Getting Started

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Installation

```bash
# Install dependencies
forge install
```

### Build

```bash
forge build
```

### Test

```bash
forge test
```

### Test with verbosity

```bash
forge test -vvv
```

## Deployment

### Local (Anvil)

```bash
# Start local node
anvil

# Deploy
forge script script/Deploy.s.sol:DeployLocalScript --rpc-url http://localhost:8545 --broadcast
```

### Mainnet/Testnet

```bash
# Set environment variables
export PRIVATE_KEY=<your-private-key>
export TON_TOKEN_ADDRESS=<ton-token-address>
export FOUNDATION_MEMBER=<foundation-member-address>
export EXTERNAL_MEMBERS=<external1>,<external2>

# Deploy
forge script script/Deploy.s.sol:DeployScript --rpc-url <rpc-url> --broadcast --verify
```

## DAO Parameters

| Parameter | Initial Value | Description |
|-----------|--------------|-------------|
| vTON 발행 비율 | 100% | 시뇨리지 대비 vTON 발행 비율 |
| 위임 상한 | 20% | Delegator당 최대 위임 비율 |
| 위임 기간 요건 | 7일 | 투표권 인정 최소 위임 기간 |
| 제안 생성 비용 | 100 TON | 제안 생성 시 소각 |
| Quorum | 4% | 최소 투표 참여율 |
| Pass Rate | 과반수 | 가결 기준 |
| Voting Period | 7일 | 온체인 투표 기간 |
| Timelock | 7일 | 실행 지연 기간 |

## Security

- Security Council: 3명 (재단 1명 + 외부 2명), 2/3 임계값
- 7일 위임 기간 요건으로 Flash Loan 공격 방어
- Timelock으로 악의적 제안 검토 시간 확보
- 위임 상한 20%로 투표권 집중 방지

## License

MIT
