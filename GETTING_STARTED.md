# ✅ MateWise MVP - Getting Started Checklist

## 📋 Initial Setup (One-time)

### Step 1: Environment Configuration
- [ ] Copy `env.template` to `.env.local`
  ```bash
  cp env.template .env.local
  ```
- [ ] Sign up for [Supabase](https://app.supabase.com) (if you haven't)
- [ ] Create a new Supabase project
- [ ] Get your Supabase credentials from Settings → API:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Add credentials to `.env.local`

### Step 2: Verify Installation
- [x] Dependencies installed (`npm install` already run)
- [x] TypeScript configured
- [x] Tailwind CSS configured
- [x] Project structure created

### Step 3: Test the Setup
- [ ] Start dev server: `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Click "Increment" button (tests Zustand)
- [ ] Click "Check API Health" (tests API routes)
- [ ] Visit http://localhost:3000/api/health directly

---

## 🚀 Daily Development Workflow

### Starting Your Day
```bash
# 1. Start development server
npm run dev

# 2. Open in browser
# http://localhost:3000
```

### Adding New Features

#### Option A: Create a New Module
```bash
# Example: Product module
mkdir -p src/modules/product
touch src/modules/product/product.service.ts
touch src/modules/product/product.types.ts
touch src/modules/product/index.ts
```

#### Option B: Add a New Page
```bash
# Example: About page
mkdir -p src/app/about
touch src/app/about/page.tsx
```

#### Option C: Add API Endpoint
```bash
# Example: Products API
mkdir -p src/app/api/products
touch src/app/api/products/route.ts
```

#### Option D: Add UI Component
```bash
# Using shadcn/ui
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add dialog
```

### Before Committing
```bash
# 1. Check for errors
npm run lint

# 2. Build to verify production readiness
npm run build

# 3. Run build locally (optional)
npm run start
```

---

## 📚 First-Time Learning Path

### Day 1: Understand the Architecture
- [ ] Read `README.md`
- [ ] Read `docs/ARCHITECTURE.md`
- [ ] Explore `src/` directory structure
- [ ] Review `src/app/page.tsx` to see examples

### Day 2: Set Up Database
- [ ] Configure Supabase (see `docs/SETUP.md`)
- [ ] Create a test table in Supabase
- [ ] Test database connection
- [ ] Try example `UserService` queries

### Day 3: Build Your First Feature
- [ ] Create a new module in `src/modules/`
- [ ] Add an API route in `src/app/api/`
- [ ] Create a page in `src/app/`
- [ ] Use Zustand for state (if needed)

### Day 4: Add UI Components
- [ ] Add shadcn/ui components you need
- [ ] Customize the design system
- [ ] Build reusable components
- [ ] Style with Tailwind

---

## 🎯 Quick Reference

### Common Commands
| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Build for production | `npm run build` |
| Start production | `npm run start` |
| Run linter | `npm run lint` |
| Add shadcn component | `npx shadcn@latest add [name]` |

### Important Files
| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Home page |
| `src/app/layout.tsx` | Root layout |
| `.env.local` | Environment variables |
| `components.json` | shadcn/ui config |

### Documentation Map
| Document | When to Read |
|----------|-------------|
| `README.md` | First - overview |
| `SETUP_COMPLETE.md` | After setup - verify completion |
| `docs/SETUP.md` | When configuring environment |
| `docs/ARCHITECTURE.md` | When understanding structure |
| `docs/QUICK_REFERENCE.md` | Daily - code patterns |
| `docs/DIRECTORY_STRUCTURE.md` | When navigating codebase |

---

## 🔧 Troubleshooting Checklist

### Dev Server Won't Start
- [ ] Check if port 3000 is available
- [ ] Delete `.next` folder: `rm -rf .next`
- [ ] Reinstall dependencies: `npm install`

### Import Errors
- [ ] Verify you're using `@/` prefix
- [ ] Check file exists at import path
- [ ] Restart TypeScript server (VS Code: Cmd/Ctrl+Shift+P → "Restart TS Server")

### Supabase Connection Issues
- [ ] Verify `.env.local` exists and has correct values
- [ ] Check Supabase project isn't paused
- [ ] Verify table names match your queries

### Styling Not Working
- [ ] Check Tailwind classes are correct
- [ ] Verify `globals.css` is imported in `layout.tsx`
- [ ] Clear cache: `rm -rf .next`

### Build Errors
- [ ] Run `npm run lint` to see errors
- [ ] Check for TypeScript errors
- [ ] Verify all imports are correct

---

## 📈 Progress Tracking

### MVP Milestones
- [x] **Phase 0:** Project setup & architecture ✅
- [ ] **Phase 1:** Database schema & Supabase setup
- [ ] **Phase 2:** Authentication & user management
- [ ] **Phase 3:** Core feature development
- [ ] **Phase 4:** UI/UX refinement
- [ ] **Phase 5:** Testing & optimization
- [ ] **Phase 6:** Deployment

### Current Status
- ✅ Project initialized
- ✅ Tech stack configured
- ✅ Folder structure created
- ✅ Example components working
- ✅ Build successful
- ⏳ Environment variables needed
- ⏳ Supabase database setup needed

---

## 🎊 You're Ready!

Everything is set up and ready to go. Follow this checklist as you progress through development.

### Next Immediate Steps:
1. ✅ **Configure `.env.local`** (see Step 1 above)
2. ✅ **Start dev server** (`npm run dev`)
3. ✅ **Test the demo page** (http://localhost:3000)
4. ✅ **Read the docs** (start with `README.md`)
5. ✅ **Build your first feature!**

---

**Happy Coding! 🚀**

*Use `docs/QUICK_REFERENCE.md` for code snippets and patterns as you develop.*
