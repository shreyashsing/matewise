# MateWise Architecture Documentation

## Overview

MateWise follows a **Modular Monolithic Architecture**, which combines the organizational benefits of microservices with the simplicity of a monolithic application.

## Architecture Principles

### 1. Modular Organization
- Code is organized into **modules** representing business domains
- Each module is self-contained with its own services, types, and logic
- Modules communicate through well-defined interfaces

### 2. Separation of Concerns

```
Frontend (src/app, src/components)
    ↓
State Management (src/stores)
    ↓
Business Logic (src/modules)
    ↓
Data Layer (src/lib/supabase)
    ↓
Database (Supabase)
```

### 3. Shared Resources
- **Components**: Reusable UI elements
- **Hooks**: Shared React hooks
- **Utils**: Common utility functions
- **Types**: Shared type definitions
- **Config**: Application-wide configuration

## Layer Descriptions

### Presentation Layer (`src/app`, `src/components`)
- **Next.js App Router** for routing and pages
- **React components** for UI
- **shadcn/ui** for consistent design system
- **Tailwind CSS** for styling

### State Management Layer (`src/stores`)
- **Zustand** stores for global state
- Stores are feature-focused (auth, user preferences, etc.)
- Use middleware: `devtools` for debugging, `persist` for persistence

### Business Logic Layer (`src/modules`)
- Domain-driven modules (user, product, order, etc.)
- Each module contains:
  - **Services**: Business logic and data operations
  - **Types**: Domain-specific types
  - **Validators**: Input validation (optional)
  - **Utils**: Module-specific utilities (optional)

Example module structure:
```
src/modules/user/
├── user.service.ts      # Business logic
├── user.types.ts        # Type definitions
├── user.validators.ts   # Validation logic (optional)
└── index.ts            # Public exports
```

### Data Layer (`src/lib`)
- **Supabase clients** for database operations
  - `client.ts`: Client-side operations
  - `server.ts`: Server-side operations with elevated permissions
- **Utilities**: Helper functions (cn, formatters, etc.)

### API Layer (`src/app/api`)
- **Next.js API Routes** for backend endpoints
- RESTful design
- Consistent response format using `ApiResponse` type
- Imports services from modules

## Data Flow

### Client-Side Data Flow
```
Component → Hook → Zustand Store → Supabase Client → Database
                                 ↘ Module Service ↗
```

### Server-Side Data Flow
```
API Route → Module Service → Supabase Admin → Database
```

## Module Communication

Modules should:
1. **Export public APIs** through `index.ts`
2. **Import from other modules** through their public API
3. **Avoid tight coupling** - use interfaces/types
4. **Follow single responsibility** - one domain per module

Example:
```typescript
// ❌ Bad - Direct import of internal file
import { UserService } from '@/modules/user/user.service'

// ✅ Good - Import from module's public API
import { UserService } from '@/modules/user'
```

## File Naming Conventions

- **Components**: PascalCase (e.g., `Button.tsx`, `UserCard.tsx`)
- **Utilities**: kebab-case (e.g., `format-date.ts`, `api-client.ts`)
- **Hooks**: kebab-case with `use-` prefix (e.g., `use-auth.ts`)
- **Services**: kebab-case with `.service.ts` suffix (e.g., `user.service.ts`)
- **Types**: kebab-case with `.types.ts` suffix (e.g., `user.types.ts`)
- **Stores**: kebab-case with `-store.ts` suffix (e.g., `auth-store.ts`)

## Best Practices

### 1. Type Safety
- Use TypeScript strictly
- Define interfaces for all data structures
- Avoid `any` types

### 2. Error Handling
```typescript
try {
  const result = await someOperation()
  return { success: true, data: result }
} catch (error) {
  console.error('Operation failed:', error)
  return { success: false, error: 'Error message' }
}
```

### 3. API Responses
Use consistent response format:
```typescript
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

### 4. Component Organization
```typescript
// 1. Imports
import { useState } from 'react'
import { Button } from '@/components/ui'

// 2. Types/Interfaces
interface MyComponentProps {
  title: string
}

// 3. Component
export function MyComponent({ title }: MyComponentProps) {
  // Hooks
  const [count, setCount] = useState(0)
  
  // Event handlers
  const handleClick = () => setCount(c => c + 1)
  
  // Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleClick}>Count: {count}</Button>
    </div>
  )
}
```

### 5. Service Layer Pattern
```typescript
export class UserService {
  // Static methods for stateless operations
  static async getUser(id: string) {
    // Implementation
  }
  
  static async createUser(data: CreateUserDto) {
    // Implementation
  }
}
```

## Testing Strategy (Future)

- **Unit Tests**: For services and utility functions
- **Integration Tests**: For API routes
- **Component Tests**: For UI components
- **E2E Tests**: For critical user flows

## Scalability Considerations

### When to Split a Module
Consider splitting when:
- Module has >10 files
- Multiple developers working on it
- Clear subdomain boundaries emerge

### Migration Path to Microservices
If needed in the future:
1. Modules are already isolated
2. Extract module to separate repo
3. Convert module service to API calls
4. Deploy as separate service

## Security Best Practices

1. **Environment Variables**: Never commit secrets
2. **Server vs Client**: Use `supabaseAdmin` only on server
3. **Input Validation**: Validate all user inputs
4. **Authentication**: Use Supabase Auth for user management
5. **Authorization**: Implement Row Level Security (RLS) in Supabase

## Performance Optimization

1. **Code Splitting**: Use dynamic imports for large components
2. **Image Optimization**: Use Next.js `Image` component
3. **API Routes**: Implement caching where appropriate
4. **Database**: Add indexes for frequently queried fields
5. **State Management**: Keep stores minimal and focused

## Monitoring & Logging

- Use `console.error` for errors (will be captured in production logs)
- Consider adding error tracking (e.g., Sentry) later
- Monitor API route performance
- Track Supabase query performance

---

**Last Updated**: January 2026  
**Version**: 1.0.0
