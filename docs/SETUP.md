# MateWise Setup Guide

## 🚀 Quick Start

Follow these steps to set up your MateWise MVP development environment.

### 1. Install Dependencies

The dependencies are already installed, but if you need to reinstall:

```bash
npm install
```

### 2. Configure Environment Variables

1. **Create `.env.local` file** in the project root:

```bash
# Copy the template
cp env.template .env.local
```

2. **Get your Supabase credentials**:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create a new project or select existing one
   - Go to **Settings** → **API**
   - Copy the following values:
     - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
     - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Update `.env.local`**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Supabase Database (Optional)

If you want to use the example User service:

1. Go to your Supabase project
2. Open **SQL Editor**
3. Run this SQL to create a users table:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies (example - adjust based on your needs)
CREATE POLICY "Users can view their own data" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

### 5. Verify Setup

1. **Check the home page** - Should display the MateWise dashboard
2. **Test Zustand** - Click the increment/decrement buttons (state persists on refresh)
3. **Test API** - Click "Check API Health" button
4. **Visit API directly** - Go to [http://localhost:3000/api/health](http://localhost:3000/api/health)

## 📁 Project Structure Overview

```
matewise/
├── src/
│   ├── app/              # Next.js pages and API routes
│   ├── components/       # Reusable UI components
│   ├── modules/          # Business logic modules
│   ├── stores/           # Zustand state stores
│   ├── lib/              # Utilities and configs
│   ├── hooks/            # Custom React hooks
│   ├── types/            # TypeScript types
│   └── config/           # App configuration
├── public/               # Static files
├── docs/                 # Documentation
│   └── ARCHITECTURE.md   # Detailed architecture guide
├── env.template          # Environment variables template
└── README.md             # Project documentation
```

## 🛠️ Next Steps

### Add shadcn/ui Components

Add more UI components using the shadcn CLI:

```bash
# Example: Add a card component
npx shadcn@latest add card

# Add a form component
npx shadcn@latest add form

# Add input component
npx shadcn@latest add input
```

Components will be added to `src/components/ui/`.

### Create a New Module

1. Create folder: `src/modules/[module-name]/`
2. Add service: `[module-name].service.ts`
3. Add types: `[module-name].types.ts`
4. Export via `index.ts`

Example for a "Product" module:

```typescript
// src/modules/product/product.types.ts
export interface Product {
  id: string
  name: string
  price: number
}

// src/modules/product/product.service.ts
import { supabase } from '@/lib/supabase'
import type { Product } from './product.types'

export class ProductService {
  static async getProducts(): Promise<Product[]> {
    const { data } = await supabase.from('products').select('*')
    return data || []
  }
}

// src/modules/product/index.ts
export * from './product.types'
export * from './product.service'
```

### Create an API Route

Example: `/api/products`

```typescript
// src/app/api/products/route.ts
import { NextResponse } from 'next/server'
import { ProductService } from '@/modules/product'
import type { ApiResponse } from '@/types'

export async function GET() {
  try {
    const products = await ProductService.getProducts()
    const response: ApiResponse = {
      success: true,
      data: products,
    }
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
```

### Add a Zustand Store

Example: Auth store

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthStore {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
```

## 🧪 Testing the Setup

### Test API Health
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "status": "ok",
    "timestamp": "2026-01-17T..."
  }
}
```

### Test Supabase Connection

Create a test API route:

```typescript
// src/app/api/test-db/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) throw error
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connected!' 
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Database connection failed' 
    }, { status: 500 })
  }
}
```

## 📚 Additional Resources

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Zustand Documentation](https://zustand-demo.pmnd.rs)
- [Supabase Docs](https://supabase.com/docs)

## ❓ Troubleshooting

### "Module not found" errors
- Make sure you're using `@/` prefix for imports
- Check `tsconfig.json` has correct path aliases
- Restart the dev server

### Supabase connection fails
- Verify environment variables in `.env.local`
- Check Supabase project is not paused
- Ensure table exists in Supabase

### Tailwind styles not working
- Clear `.next` folder: `rm -rf .next`
- Restart dev server: `npm run dev`

### Type errors
- Run `npm run build` to check for type errors
- Ensure all imports use correct paths

## 🎯 You're All Set!

Your MateWise MVP is now ready for development. Start building your features using the modular architecture!

For detailed architecture information, see `docs/ARCHITECTURE.md`.
