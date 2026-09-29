# Clean Architecture Blueprint - ShiftTrack (NexBrix Design)

## Folder Structure
src/
├── app/                      # Navigation / Screens (Presentation Layer)
│   ├── (auth)/
│   │   └── login.tsx
│   ├── (tabs)/
│   │   ├── index.tsx         # Weekly Shifts Dashboard
│   │   ├── active.tsx        # Active Shift & Live Timer
│   │   └── create.tsx        # Create Shift Form
│   └── _layout.tsx
├── core/                     # Domain Layer & Pure Business Logic
│   ├── entities/             # Shift, User, AuthToken entities
│   │   ├── Shift.ts
│   │   └── User.ts
│   ├── usecases/             # Isolated Use Cases
│   │   ├── AuthenticateUser.ts
│   │   ├── GetWeeklyShifts.ts
│   │   ├── CreateShift.ts
│   │   ├── StartShift.ts
│   │   └── EndShift.ts
│   └── interfaces/           # Repository Interfaces & Ports
│       ├── IAuthRepository.ts
│       └── IShiftRepository.ts
├── infrastructure/           # Data & External Adapter Layer
│   ├── api/                  # Axios/Fetch client with mock interceptor/MSW
│   │   ├── mockApi.ts
│   │   └── endpoints.ts
│   ├── repositories/         # Implemented Repositories
│   │   ├── AuthRepository.ts
│   │   └── ShiftRepository.ts
│   └── storage/              # Secure Store Persistence (Expo SecureStore)
│       └── SecureStorage.ts
├── presentation/             # UI Components & State Management
│   ├── components/           # NexBrix Atomic UI Components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── LiveTimer.tsx
│   │   ├── LoadingState.tsx
│   │   ├── ErrorState.tsx
│   │   └── EmptyState.tsx
│   ├── context/ / store/     # State management (Zustand or Context API)
│   │   ├── useAuthStore.ts
│   │   └── useShiftStore.ts
│   └── theme/                # NexBrix Theme Tokens
│       ├── colors.ts
│       └── typography.ts
└── tests/                # Unit & Integration Tests (Vitest / Jest)
├── entities/
├── usecases/
└── presentation/