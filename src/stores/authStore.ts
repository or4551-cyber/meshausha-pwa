import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  branchCode: string
  branch: string
  isAdmin: boolean
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  rememberMe: boolean
  login: (pin: string, remember?: boolean) => boolean
  logout: () => void
  setRememberMe: (remember: boolean) => void
}

const BRANCH_PINS: Record<string, string> = {
  '1001': 'עין המפרץ',
  '1002': 'ביאליק קרן היסוד',
  '1003': 'מוצקין הילדים',
  '1004': 'צור שלום',
  '1005': 'גושן 60',
  '1006': 'נהריה הגעתון',
  '1007': 'ההסתדרות',
  '1008': 'משכנות האומנים',
  '1009': 'רון קריית ביאליק',
  '9999': 'ADMIN'
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      rememberMe: false,
      
      login: (pin: string, remember = false) => {
        const branch = BRANCH_PINS[pin]
        
        if (branch) {
          set({
            isAuthenticated: true,
            user: {
              branchCode: pin,
              branch,
              isAdmin: pin === '9999'
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
