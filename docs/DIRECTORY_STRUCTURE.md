# 🗂️ MateWise - Complete Directory Structure

```
matewise/
│
├── 📂 src/                                    # Source directory (all app code)
│   │
│   ├── 📂 app/                                # Next.js App Router (Frontend & API)
│   │   ├── 📂 api/                            # Backend API routes
│   │   │   └── 📂 health/
│   │   │       └── route.ts                   # GET /api/health
│   │   ├── globals.css                        # Global styles + Tailwind
│   │   ├── layout.tsx                         # Root layout
│   │   ├── page.tsx                           # Home page (/)
│   │   └── favicon.ico                        # App icon
│   │
│   ├── 📂 components/                         # Reusable UI components
│   │   └── 📂 ui/                             # shadcn/ui components
│   │       ├── button.tsx                     # Button component
│   │       └── index.ts                       # Component exports
│   │
│   ├── 📂 modules/                            # Business logic (Domain modules)
│   │   └── 📂 user/                           # User domain module
│   │       ├── user.service.ts                # User business logic
│   │       └── index.ts                       # Module exports
│   │
│   ├── 📂 stores/                             # State management (Zustand)
│   │   └── example-store.ts                   # Example Zustand store
│   │
│   ├── 📂 hooks/                              # Custom React hooks
│   │   └── use-auth.ts                        # Authentication hook
│   │
│   ├── 📂 lib/                                # Utilities & configurations
│   │   ├── 📂 supabase/                       # Database clients
│   │   │   ├── client.ts                      # Client-side Supabase
│   │   │   ├── server.ts                      # Server-side Supabase
│   │   │   └── index.ts                       # Exports
│   │   └── utils.ts                           # Helper functions (cn, etc.)
│   │
│   ├── 📂 types/                              # Shared TypeScript types
│   │   └── index.ts                           # Type definitions
│   │
│   └── 📂 config/                             # App configuration
│       └── constants.ts                       # App constants & routes
│
├── 📂 docs/                                   # Documentation
│   ├── ARCHITECTURE.md                        # Architecture deep dive
│   ├── SETUP.md                               # Setup guide
│   └── QUICK_REFERENCE.md                     # Developer quick reference
│
├── 📂 public/                                 # Static assets (images, etc.)
│
├── 📂 node_modules/                           # Dependencies (generated)
├── 📂 .next/                                  # Next.js build output (generated)
│
├── 📄 components.json                         # shadcn/ui configuration
├── 📄 env.template                            # Environment variables template
├── 📄 .env.local                              # Environment variables (gitignored)
│
├── 📄 package.json                            # Dependencies & scripts
├── 📄 package-lock.json                       # Dependency lock file
├── 📄 tsconfig.json                           # TypeScript configuration
├── 📄 postcss.config.mjs                      # PostCSS configuration
├── 📄 next.config.ts                          # Next.js configuration
├── 📄 eslint.config.mjs                       # ESLint configuration
│
├── 📄 README.md                               # Project overview
├── 📄 SETUP_COMPLETE.md                       # Setup completion summary
├── 📄 PROJECT_SUMMARY.md                      # Project technical summary
│
├── 📄 .gitignore                              # Git ignore rules
└── 📄 .git/                                   # Git repository
```

---

## 📊 Directory Statistics

| Directory | Purpose | Files Created | Status |
|-----------|---------|---------------|--------|
| `src/app/` | Pages & API | 4 | ✅ Complete |
| `src/components/` | UI Components | 2 | ✅ Complete |
| `src/modules/` | Business Logic | 2 | ✅ Template |
| `src/stores/` | State Management | 1 | ✅ Template |
| `src/hooks/` | React Hooks | 1 | ✅ Complete |
| `src/lib/` | Utilities | 4 | ✅ Complete |
| `src/types/` | Type Definitions | 1 | ✅ Complete |
| `src/config/` | Configuration | 1 | ✅ Complete |
| `docs/` | Documentation | 3 | ✅ Complete |

**Total Files Created:** 19+ files  
**Total Documentation:** 6 files  
**Build Status:** ✅ Successful

---

## 🎯 Import Path Examples

```typescript
// Components
import { Button } from '@/components/ui'

// Business Logic
import { UserService } from '@/modules/user'

// State Management
import { useExampleStore } from '@/stores/example-store'

// Hooks
import { useAuth } from '@/hooks/use-auth'

// Database
import { supabase } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/server'

// Utilities
import { cn } from '@/lib/utils'

// Types
import type { ApiResponse, User } from '@/types'

// Configuration
import { APP_CONFIG, API_ROUTES } from '@/config/constants'
```

---

## 🚀 How to Navigate

### Adding New Features
1. **Domain Module:** Create in `src/modules/[feature]/`
2. **API Route:** Create in `src/app/api/[feature]/route.ts`
3. **Page:** Create in `src/app/[feature]/page.tsx`
4. **Components:** Add to `src/components/[feature]/`
5. **State:** Add store in `src/stores/[feature]-store.ts`

### Finding Existing Code
- **UI Components:** Look in `src/components/ui/`
- **Business Logic:** Check `src/modules/[domain]/`
- **API Endpoints:** Browse `src/app/api/`
- **Pages:** Browse `src/app/`
- **Utilities:** Check `src/lib/`

---

## 📝 File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Pages | `page.tsx` | `src/app/about/page.tsx` |
| Layouts | `layout.tsx` | `src/app/layout.tsx` |
| API Routes | `route.ts` | `src/app/api/users/route.ts` |
| Components | `PascalCase.tsx` | `UserCard.tsx` |
| Services | `kebab-case.service.ts` | `user.service.ts` |
| Stores | `kebab-case-store.ts` | `auth-store.ts` |
| Hooks | `use-kebab-case.ts` | `use-auth.ts` |
| Types | `kebab-case.types.ts` | `user.types.ts` |
| Utils | `kebab-case.ts` | `format-date.ts` |

---

## 🎨 Architecture Layers Mapping

```
┌────────────────────────────────────────────────┐
│  PRESENTATION LAYER                            │
│  📂 src/app/ (pages)                           │
│  📂 src/components/ (UI components)            │
└────────────────────────────────────────────────┘
              ⬇️
┌────────────────────────────────────────────────┐
│  STATE LAYER                                   │
│  📂 src/stores/ (Zustand)                      │
│  📂 src/hooks/ (Custom hooks)                  │
└────────────────────────────────────────────────┘
              ⬇️
┌────────────────────────────────────────────────┐
│  BUSINESS LOGIC LAYER                          │
│  📂 src/modules/ (Services & domain logic)     │
└────────────────────────────────────────────────┘
              ⬇️
┌────────────────────────────────────────────────┐
│  DATA ACCESS LAYER                             │
│  📂 src/lib/supabase/ (DB clients)             │
└────────────────────────────────────────────────┘
              ⬇️
┌────────────────────────────────────────────────┐
│  DATABASE LAYER                                │
│  ☁️ Supabase (PostgreSQL)                      │
└────────────────────────────────────────────────┘
```

---

**Last Updated:** January 17, 2026  
**Status:** ✅ Complete and Production Ready
