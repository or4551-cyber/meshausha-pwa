import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BRANCH_BY_CODE, ADMIN_BRANCH } from '../data/branches'

interface User {
  branchCode: string
  branch: string
  isAdmin: boolean
  username?: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  rememberMe: boolean
  login: (pin: string, remember?: boolean) => boolean
  logout: () => void
  setRememberMe: (remember: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      rememberMe: false,
      
      login: (pin: string, remember = false) => {
        const branch = BRANCH_BY_CODE[pin]

        if (branch) {
          set({
            isAuthenticated: true,
            user: {
              branchCode: pin,
              branch,
              isAdmin: pin === ADMIN_BRANCH.code
            },
            rememberMe: remember
          })
          return true
        }

        return false
      },
      
      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          rememberMe: false
        })
      },
      
      setRememberMe: (remember: boolean) => {
        set({ rememberMe: remember })
      }
    }),
    {
      name: 'meshausha-auth',
      partialize: (state) => 
        state.rememberMe 
          ? { isAuthenticated: state.isAuthenticated, user: state.user, rememberMe: state.rememberMe }
          : { rememberMe: false }
    }
  )
)
