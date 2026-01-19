'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore, useCartStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { setUser, setIsLoading } = useAuthStore()
  const { loadCart, clearCart } = useCartStore()

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        clearCart()
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        // If profile doesn't exist, sign out the user
        await supabase.auth.signOut()
        setUser(null)
        return
      }
      
      if (data) {
        // Check if user is suspended
        if (data.is_suspended) {
          await supabase.auth.signOut()
          setUser(null)
          clearCart()
          toast.error('Your account has been suspended. Please contact support.')
          router.push('/auth/login')
          return
        }
        
        setUser(data)
        // Load cart for buyers
        if (data.role === 'buyer') {
          loadCart(userId)
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  return <>{children}</>
}
