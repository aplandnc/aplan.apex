# APLAN Monorepo

## 📁 프로젝트 구조

```
/apex
├── pnpm-workspace.yaml
├── package.json
│
├── apps/
│   ├── admin/           (관리자 대시보드)
│   ├── attendance/      (출근 체크 앱)
│   ├── visitor/         (방문자 관리)
│   └── consultation/    (상담 관리)
│
└── packages/
    ├── ui/              (공통 컴포넌트)
    ├── types/           (공통 타입)
    └── config/          (공통 설정)
```

## 🚀 설치 및 실행

### 1. pnpm 설치 (처음 한 번만)
```bash
npm install -g pnpm
```

### 2. 의존성 설치
```bash
cd C:\APLAN\develop\apex
pnpm install
```

### 3. 개발 서버 실행

**특정 앱만 실행:**
```bash
pnpm dev:admin          # 관리자 앱만
pnpm dev:attendance     # 출근 앱만
pnpm dev:visitor        # 방문자 앱만
```

**모든 앱 동시 실행:**
```bash
pnpm dev:all
```

## 📦 앱별 포트

- Admin: http://localhost:3000
- Attendance: http://localhost:3001
- Visitor: http://localhost:3002
- Consultation: http://localhost:3003

## 📝 명령어

```bash
pnpm install              # 전체 의존성 설치
pnpm dev:admin            # 관리자 앱 실행
pnpm build:all            # 전체 빌드
```
