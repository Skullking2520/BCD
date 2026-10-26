# 블록체인 기반 게임 아이템 거래

블록체인 수업에서 팀 과제로 진행한 게임 아이템 거래 웹앱입니다. 지갑을 연결하고 스마트 계약을 통해 아이템 등록·거래 흐름을 구현하는 과제입니다.

| 항목 | 내용 |
| --- | --- |
| 수행 배경 | 블록체인 수업 팀 과제 |
| 주요 구성 | 웹 화면 · API · 스마트 계약 |
| 실행 환경 | Hardhat 로컬 네트워크 기반 개발·시연 |

## 코드 안내

| 영역 | 내용 | 위치 |
| --- | --- | --- |
| 프론트엔드 | 지갑 연결, 아이템 탐색과 거래 화면 | [frontend/](frontend/) |
| 백엔드 | API와 데이터 처리 | [backend/](backend/) |
| 스마트 계약 | 게임 등록·아이템 거래 | [hardhat/contracts/](hardhat/contracts/) |
| 배포 스크립트 | 로컬 계약 배포 | [hardhat/scripts/](hardhat/scripts/) |
| 데이터베이스 | DB 관련 파일 | [database/](database/) |

## 로컬 시연 시작

Node.js와 npm, 지갑 브라우저 확장을 사용하는 개발 환경입니다.

```bash
npm run install:all
npm run dev:working
```

`dev:working`은 [start-working.js](start-working.js)에 정의된 시연 경로입니다. Hardhat 노드를 시작하고 간단한 계약을 배포한 뒤 프론트엔드를 실행합니다. 이 경로가 백엔드까지 자동 실행하는 것은 아닙니다.

| 서비스 | 기본 주소 |
| --- | --- |
| Hardhat 로컬 노드 | `http://localhost:8545` |
| 웹 화면 | `http://localhost:3000` |

API 경로를 별도로 확인하려면 `npm run backend`를 사용합니다. 계약 컴파일·테스트 명령은 [hardhat/package.json](hardhat/package.json)을 참고하세요.

## 상세 문서

- [기존 기술별 설명](docs/TECHNICAL_MAP.md)
- [개발·문제 해결 안내](docs/README.md)
- [기존 과제 결과 정리](PROJECT_SUMMARY.md)

수업 과제의 구현·시연 기록이며, 실제 사용자를 대상으로 운영한 서비스 실적으로 제시하지 않습니다.
