# MateWise MVP

A modular monolithic application built with Next.js, TypeScript, Tailwind CSS, shadcn/ui, Zustand, and Supabase.

## 🏗️ Architecture

This project follows a **modular monolithic architecture**, organizing code into focused, maintainable modules while keeping everything in a single codebase.

### Folder Structure

```
matewise/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (Backend)
│   │   │   └── health/        # Health check endpoint
│   │   ├── (routes)/          # Frontend routes (add your pages here)
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   │
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # shadcn/ui components
│   │   └── features/         # Feature-specific components
│   │
│   ├── modules/              # Business logic modules (Domain-driven)
│   │   └── user/            # Example: User module
│   │       ├── user.service.ts
│   │       ├── user.types.ts
│   │       └── index.ts
│   │
│   ├── lib/                  # Shared utilities and configurations
│   │   ├── supabase/        # Supabase client & server setup
│   │   │   ├── client.ts    # Client-side Supabase
│   │   │   ├── server.ts    # Server-side Supabase (admin)
│   │   │   └── index.ts
│   │   └── utils.ts         # Utility functions (cn, etc.)
│   │
│   ├── stores/              # Zustand state management
│   │   └── example-store.ts
│   │
│   ├── hooks/               # Custom React hooks
│   │   └── use-auth.ts
│   │
│   ├── types/               # Shared TypeScript types
│   │   └── index.ts
│   │
│   └── config/              # App configuration
│       └── constants.ts
│
├── public/                  # Static assets
├── env.template            # Environment variables template
└── package.json

```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for database)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Copy `env.template` to `.env.local` and fill in your Supabase credentials:

```bash
cp env.template .env.local
```

Update the values in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

3. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4, shadcn/ui components
- **State Management:** Zustand
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth

## 🧩 Key Concepts

### Modular Monolithic Architecture

- **Modules (`src/modules/`)**: Each module represents a business domain (e.g., user, product, order)
  - Self-contained with services, types, and domain logic
  - Export public APIs through `index.ts`
  
- **Shared Layers:**
  - `components/`: Reusable UI components
  - `lib/`: Utilities and third-party integrations
  - `hooks/`: Custom React hooks
  - `stores/`: Global state management
  - `types/`: Shared type definitions

### Path Aliases

Use `@/` to import from the `src` directory:

```typescript
import { Button } from '@/components/ui'
import { UserService } from '@/modules/user'
import { supabase } from '@/lib/supabase'
```

### API Routes

API routes are in `src/app/api/`:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
```

Access at: `http://localhost:3000/api/health`

### State Management with Zustand

```typescript
import { useExampleStore } from '@/stores/example-store'

function Component() {
  const { count, increment } = useExampleStore()
  // ...
}
```

### Supabase Integration

```typescript
// Client-side (components, hooks)
import { supabase } from '@/lib/supabase/client'

// Server-side (API routes, server components)
import { supabaseAdmin } from '@/lib/supabase/server'
```

## 📝 Development Guidelines

### Adding a New Module

1. Create a new folder in `src/modules/[module-name]/`
2. Add service layer: `[module-name].service.ts`
3. Add types: `[module-name].types.ts`
4. Export public API via `index.ts`

### Adding a New UI Component

1. Create component in `src/components/ui/[component-name].tsx`
2. Use the `cn()` utility for class merging
3. Export from `src/components/ui/index.ts`

### Adding a New API Route

1. Create route handler in `src/app/api/[route-name]/route.ts`
2. Use the `ApiResponse` type for consistent responses
3. Import services from modules as needed

## 🔧 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🌐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | Yes |
| `NEXT_PUBLIC_APP_URL` | Your app URL | No (defaults to localhost:3000) |

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Zustand](https://zustand-demo.pmnd.rs)
- [Supabase](https://supabase.com/docs)

## 📄 License

Private - MateWise MVP
