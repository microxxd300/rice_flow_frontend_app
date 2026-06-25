# Rice Flow - React Native Production App

A professional, scalable React Native + Expo + TypeScript project with production-ready architecture, best practices, and modern tooling.

## Architecture Overview

This project follows **clean architecture** with:

- **Feature-based structure**: Business domains (auth, home) are self-contained
- **Clear separation of concerns**: Global setup, features, shared utilities
- **Type safety**: Full TypeScript with Zod validation
- **Scalability**: Easy to add new features without affecting existing ones
- **Reusable patterns**: Consistent approach to stores, hooks, components

### Folder Structure

```
src/
├── app/                    # Global app setup & providers
│   ├── App.tsx            # Root component
│   ├── providers.tsx      # Provider stack (Query, Navigation, Gestures)
│   ├── queryClient.ts     # TanStack Query configuration
│   ├── navigation/        # Navigation setup (RootNavigator, AuthNavigator, AppNavigator)
│   └── store/             # Global Zustand stores (auth.store)
│
├── features/              # Feature modules (business domains)
│   ├── auth/              # Authentication feature
│   │   ├── screens/       # Screen components
│   │   ├── store/         # Feature-specific Zustand store
│   │   ├── types.ts       # Feature types
│   │   └── index.ts       # Barrel export
│   └── home/              # Home feature
│       ├── screens/
│       ├── store/
│       ├── navigation/    # Feature-specific navigation
│       ├── types.ts
│       └── index.ts
│
├── components/            # Shared UI components
│   ├── ScreenWrapper.tsx  # Universal screen wrapper
│   ├── Button.tsx         # Reusable button
│   ├── TextInput.tsx      # Validated text input
│   ├── Card.tsx           # Card component
│   ├── Spacer.tsx         # Spacing helper
│   └── index.ts           # Barrel export
│
├── services/              # Shared services
│   ├── api.ts             # Axios client with interceptors
│   ├── storage.ts         # AsyncStorage wrapper
│   ├── api-operations.ts  # Typed API operations (example)
│   └── index.ts           # Barrel export
│
├── theme/                 # Design tokens
│   ├── colors.ts          # Color palette
│   ├── spacing.ts         # Spacing & radius scale
│   ├── typography.ts      # Text styles
│   ├── index.ts           # Theme object
│   └── useTheme.ts        # Hook to use theme
│
├── hooks/                 # Shared hooks
│   ├── useAppTheme.ts
│   ├── useAuth.ts
│   └── index.ts
│
├── utils/                 # Utility functions
│   ├── validation.ts      # Zod schemas
│   └── formatting.ts      # Format helpers
│
├── constants/             # App constants
│   ├── routes.ts          # Route definitions
│   ├── sizes.ts           # Component sizes
│   └── api.ts             # API constants
│
├── types/                 # Global TypeScript types
│   ├── common.ts
│   ├── api.ts
│   └── index.ts
│
└── config/                # Environment & config
    ├── env.ts             # Environment variables
    ├── api.ts             # API configuration
    └── index.ts
```

## Tech Stack

- **Framework**: React Native 0.74 + Expo 51
- **Language**: TypeScript
- **State Management**: Zustand (lightweight, simple)
- **Server State**: TanStack Query (React Query)
- **Navigation**: React Navigation
- **Forms**: React Hook Form + Zod (validation)
- **HTTP Client**: Axios (with interceptors)
- **Storage**: AsyncStorage
- **Linting**: ESLint + Prettier
- **Testing**: Jest + React Native Testing Library

## Project Setup

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Environment Setup

Copy the environment example file:

```bash
cp .env.example .env
```

Then update `.env` with your API URL:

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_ENV=development
```

### 3. Start Development

```bash
# Start Expo development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

## Available Commands

### Development
```bash
npm start           # Start Expo dev server
npm run ios         # Run iOS
npm run android     # Run Android
npm run web         # Run web
```

### Code Quality
```bash
npm run type-check  # TypeScript type checking
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
npm run format      # Format with Prettier
npm run format:check # Check formatting
```

### Testing
```bash
npm test            # Run tests once
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## Key Patterns & Examples

### 1. Feature Structure

Each feature (auth, home) has its own folder with:

```typescript
// Feature store (Zustand)
export const useHomeStore = create<HomeState>(set => ({
  items: [],
  fetchItems: async () => { /* ... */ }
}));

// Feature types
export interface HomeItem {
  id: string;
  title: string;
}

// Feature screens
export const HomeListScreen = () => {
  const { items } = useHomeStore();
  return <ScreenWrapper>...</ScreenWrapper>;
};
```

### 2. Form Validation with React Hook Form + Zod

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginScreen = () => {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  return (
    <Controller
      control={control}
      name="email"
      render={({ field }) => (
        <TextInput 
          {...field}
          error={errors.email?.message}
        />
      )}
    />
  );
};
```

### 3. API Calls with TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/api';

export const HomeListScreen = () => {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.HOME_ITEMS,
    queryFn: () => homeApi.getItems(),
  });

  return <FlatList data={data} />;
};
```

### 4. Global State with Zustand

```typescript
import { create } from 'zustand';

export const useAuthStore = create<AuthState>(set => ({
  isAuthenticated: false,
  user: null,
  
  login: async (email, password) => {
    set({ isLoading: true });
    // API call...
    set({ user: data.user, isAuthenticated: true });
  },
}));

// Use in component
const { user, login } = useAuthStore();
```

### 5. Theme Usage

```typescript
import { useTheme } from '@/theme';

export const MyComponent = () => {
  const theme = useTheme();
  
  return (
    <View style={{ padding: theme.spacing.lg }}>
      <Text style={theme.typography.h1}>
        {theme.colors.primary}
      </Text>
    </View>
  );
};
```

### 6. Shared Components

```typescript
import { ScreenWrapper, Button, TextInput, Card, Spacer } from '@/components';

export const MyScreen = () => {
  return (
    <ScreenWrapper>
      <Card>
        <TextInput label="Email" />
        <Spacer size="lg" />
        <Button label="Submit" onPress={() => {}} />
      </Card>
    </ScreenWrapper>
  );
};
```

## API Client Setup

The API client (`src/services/api.ts`) includes:

- **Base configuration** from `src/config/api.ts`
- **Request interceptors**: Automatically adds auth token
- **Response interceptors**: Handles token refresh on 401
- **Type safety**: Typed requests and responses

Example usage:

```typescript
import { apiClient } from '@/services/api';

// In API service
export const homeApi = {
  getItems: async () => {
    const response = await apiClient.get<Item[]>('/items');
    return response.data;
  }
};
```

## Storage

AsyncStorage wrapper for type-safe storage:

```typescript
import { storage } from '@/services/storage';

// Set item
await storage.setItem('user', userData);

// Get item
const user = await storage.getItem<User>('user');

// Remove item
await storage.removeItem('user');

// Clear all
await storage.clear();
```

## Testing

Tests are located in `__tests__/` folder:

```bash
__tests__/
├── setup.ts                   # Jest setup
├── components/Button.test.tsx # Component tests
└── stores/auth.store.test.ts  # Store tests
```

Run tests:

```bash
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Path Aliases

The project uses TypeScript path aliases for clean imports:

```typescript
// Instead of
import { Button } from '../../components';

// Use
import { Button } from '@/components';
```

Aliases are configured in:
- `tsconfig.json` (TypeScript)
- `babel.config.js` (Babel/Metro)
- `jest.config.js` (Jest)

Available aliases:
- `@/*` - src folder
- `@/app` - src/app
- `@/features` - src/features
- `@/components` - src/components
- `@/services` - src/services
- `@/theme` - src/theme
- `@/hooks` - src/hooks
- `@/utils` - src/utils
- `@/constants` - src/constants
- `@/types` - src/types
- `@/config` - src/config

## Adding a New Feature

1. Create feature folder: `src/features/my-feature/`
2. Add subfolders:
   - `screens/` - Screen components
   - `store/` - Zustand store if needed
   - `components/` - Feature-specific components
   - `navigation/` - Feature navigation if needed
3. Create `types.ts` - Feature types
4. Create `index.ts` - Barrel export
5. Import in navigation or app setup

Example:

```typescript
// src/features/my-feature/index.ts
export { MyFeatureScreen } from './screens/MyFeatureScreen';
export { useMyFeatureStore } from './store';
export type { MyFeatureItem } from './types';
```

## Best Practices

### 1. Component Organization
- Use `ScreenWrapper` for all screen components
- Keep components functional and reusable
- Export from barrel files (`index.ts`)

### 2. State Management
- Use **Zustand** for app state (auth, theme)
- Use **TanStack Query** for server state (API data)
- Keep state slices small and focused

### 3. Forms & Validation
- Use **React Hook Form** for forms
- Use **Zod** schemas for validation
- Define schemas in `utils/validation.ts` for reuse

### 4. Type Safety
- Use strict TypeScript (`tsconfig.json`)
- Define types in feature `types.ts`
- Use `@/types` for global types

### 5. Testing
- Write tests for critical logic
- Mock external dependencies
- Aim for high coverage on stores and utils

### 6. Code Quality
- Run ESLint before committing
- Format code with Prettier
- Run type-check: `npm run type-check`

## Troubleshooting

### Metro bundler issues
```bash
npm start -- --reset-cache
```

### AsyncStorage errors
Ensure `@react-native-async-storage/async-storage` is installed

### Navigation errors
Check that navigation params types match in `@react-navigation/native`

### TypeScript errors
```bash
npm run type-check  # See all type errors
```

## Project Configuration Files

- **tsconfig.json** - TypeScript strict mode, path aliases
- **app.json** - Expo configuration
- **babel.config.js** - Babel with path aliases and reanimated
- **.eslintrc.json** - ESLint rules
- **prettier.config.js** - Code formatting
- **jest.config.js** - Jest testing configuration
- **.env.example** - Environment variable template

## Resources

- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
- [React Navigation](https://reactnavigation.org)
- [Zustand](https://github.com/pmndrs/zustand)
- [TanStack Query](https://tanstack.com/query)
- [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev)

## License

This is a starter template for professional React Native applications.
