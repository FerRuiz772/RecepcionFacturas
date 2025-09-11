import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export function useNotFound() {
  const router = useRouter()
  const authStore = useAuthStore()
  
  const goToDashboard = () => {
    router.push('/dashboard')
  }
  
  const goBack = () => {
    router.go(-1)
  }

  return {
    // Store access
    authStore,
    
    // Functions
    goToDashboard,
    goBack
  }
}
