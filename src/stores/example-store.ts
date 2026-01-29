import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

/**
 * Example store interface
 */
interface ExampleStore {
    count: number
    increment: () => void
    decrement: () => void
    reset: () => void
}

/**
 * Example Zustand store with devtools and persist middleware
 * This is a template - customize based on your app's state needs
 */
export const useExampleStore = create<ExampleStore>()(
    devtools(
        persist(
            (set) => ({
                count: 0,
                increment: () => set((state) => ({ count: state.count + 1 })),
                decrement: () => set((state) => ({ count: state.count - 1 })),
                reset: () => set({ count: 0 }),
            }),
            {
                name: 'example-storage',
            }
        )
    )
)
