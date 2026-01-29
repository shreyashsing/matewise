# MateWise Quick Reference

## 🔥 Common Commands

```bash
# Development
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Add shadcn components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add form
```

## 📂 File Structure Cheat Sheet

```
src/
├── app/                    # Pages & API Routes
│   ├── page.tsx           # Home page → /
│   ├── about/page.tsx     # About page → /about
│   └── api/               # API routes
│       └── [name]/route.ts # → /api/[name]
│
├── components/ui/         # shadcn/ui components
├── modules/               # Business logic
│   └── [domain]/
│       ├── [domain].service.ts
│       ├── [domain].types.ts
│       └── index.ts
│
├── stores/                # Zustand stores
├── hooks/                 # Custom hooks
├── lib/                   # Utilities
└── types/                 # Shared types
```

## 🎯 Quick Patterns

### Import Patterns
```typescript
// Components
import { Button } from '@/components/ui'

// Services
import { UserService } from '@/modules/user'

// Utils
import { cn } from '@/lib/utils'

// Supabase
import { supabase } from '@/lib/supabase/client'        // Client-side
import { supabaseAdmin } from '@/lib/supabase/server'   // Server-side

// Stores
import { useExampleStore } from '@/stores/example-store'

// Types
import type { ApiResponse } from '@/types'
```

### Create a Page
```typescript
// src/app/about/page.tsx
export default function AboutPage() {
  return <div>About Page</div>
}
```

### Create an API Route
```typescript
// src/app/api/hello/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Hello!' })
}

export async function POST(request: Request) {
  const body = await request.json()
  return NextResponse.json({ received: body })
}
```

### Use Zustand Store
```typescript
'use client'

import { useExampleStore } from '@/stores/example-store'

export function Counter() {
  const { count, increment } = useExampleStore()
  
  return (
    <button onClick={increment}>
      Count: {count}
    </button>
  )
}
```

### Query Supabase
```typescript
// Client-side
import { supabase } from '@/lib/supabase/client'

const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()

// Server-side (API routes)
import { supabaseAdmin } from '@/lib/supabase/server'

const { data, error } = await supabaseAdmin
  .from('users')
  .insert({ email, name })
```

### Create a Service
```typescript
// src/modules/product/product.service.ts
import { supabase } from '@/lib/supabase'
import type { Product } from './product.types'

export class ProductService {
  static async getAll(): Promise<Product[]> {
    const { data } = await supabase.from('products').select('*')
    return data || []
  }

  static async getById(id: string): Promise<Product | null> {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    return data
  }

  static async create(product: Partial<Product>): Promise<Product | null> {
    const { data } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single()
    return data
  }
}
```

### Create a Component
```typescript
// src/components/ProductCard.tsx
import { Button } from '@/components/ui'
import type { Product } from '@/modules/product'

interface ProductCardProps {
  product: Product
  onAdd: (id: string) => void
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">{product.name}</h3>
      <p className="text-2xl">${product.price}</p>
      <Button onClick={() => onAdd(product.id)}>
        Add to Cart
      </Button>
    </div>
  )
}
```

### Custom Hook
```typescript
// src/hooks/use-products.ts
import { useState, useEffect } from 'react'
import { ProductService } from '@/modules/product'
import type { Product } from '@/modules/product'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ProductService.getAll()
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  return { products, loading }
}
```

## 🎨 Tailwind Utilities

```typescript
// Use cn() to merge classes
import { cn } from '@/lib/utils'

<div className={cn(
  "base-class",
  condition && "conditional-class",
  "override-class"
)} />
```

## 🔒 Environment Variables

```env
# .env.local (gitignored)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Rules:**
- `NEXT_PUBLIC_*` → Available in browser
- No prefix → Server-side only
- Never commit `.env.local` to git

## 📝 TypeScript Tips

```typescript
// Always type your props
interface Props {
  title: string
  count?: number  // Optional
}

// Use ApiResponse type
import type { ApiResponse } from '@/types'

const response: ApiResponse<Product[]> = {
  success: true,
  data: products
}

// Server components can be async
export default async function Page() {
  const data = await fetchData()
  return <div>{data}</div>
}
```

## 🚀 Production Checklist

- [ ] Environment variables set in production
- [ ] Database migrations run in Supabase
- [ ] Row Level Security (RLS) enabled
- [ ] API routes have error handling
- [ ] Forms have validation
- [ ] Images use Next.js `<Image />` component
- [ ] Secrets not in client code
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors

## 🐛 Debug Commands

```bash
# Clear build cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript
npx tsc --noEmit

# Check for outdated packages
npm outdated
```

## 📱 Useful URLs

- Dev server: http://localhost:3000
- API health: http://localhost:3000/api/health
- Supabase dashboard: https://app.supabase.com

---

**Keep this handy while developing!** 🎯
