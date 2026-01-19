'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore, useCartStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { ShoppingBag, User, LogOut, Menu, X, Heart, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const { itemCount } = useCartStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    toast.success('Signed out successfully')
    router.push('/')
  }

  return (
    <nav className="glass sticky top-0 z-50 border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-thrift-dark rounded-full flex items-center justify-center">
              <Store className="w-6 h-6 text-thrift-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-thrift-dark">
              UkayUkay
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-thrift-dark hover:text-thrift-gray transition-colors font-medium">
              Shop
            </Link>
            {user && (
              <>
                {user.role === 'seller' && (
                  <Link href="/seller/dashboard" className="text-thrift-dark hover:text-thrift-gray transition-colors font-medium">
                    My Store
                  </Link>
                )}
                {user.role === 'buyer' && (
                  <>
                    <Link href="/buyer/wishlist" className="text-thrift-dark hover:text-red-500 transition-colors">
                      <Heart className="w-6 h-6" />
                    </Link>
                    <Link href="/buyer/cart" className="relative text-thrift-dark hover:text-thrift-gray transition-colors">
                      <ShoppingBag className="w-6 h-6" />
                      {itemCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-thrift-dark text-thrift-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {itemCount}
                        </span>
                      )}
                    </Link>
                    <Link href="/buyer/orders" className="text-thrift-dark hover:text-thrift-gray transition-colors font-medium">
                      Orders
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <NotificationBell userId={user.id} />
                <Link href={user.role === 'seller' ? '/seller/profile' : '/buyer/profile'}>
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors">
                    <User className="w-5 h-5" />
                    <span>{user.full_name}</span>
                  </button>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 text-gray-700 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <Link href="/auth/login">
                  <button className="btn-outline">Sign In</button>
                </Link>
                <Link href="/auth/signup">
                  <button className="btn-primary">Get Started</button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {user && <NotificationBell userId={user.id} />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-primary-600"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-4 space-y-4">
            <Link href="/" className="block text-gray-700 hover:text-primary-600" onClick={() => setMobileMenuOpen(false)}>
              Shop
            </Link>
            {user && (
              <>
                {user.role === 'seller' && (
                  <Link href="/seller/dashboard" className="block text-gray-700 hover:text-primary-600" onClick={() => setMobileMenuOpen(false)}>
                    My Store
                  </Link>
                )}
                {user.role === 'buyer' && (
                  <>
                    <Link href="/buyer/wishlist" className="block text-gray-700 hover:text-red-500" onClick={() => setMobileMenuOpen(false)}>
                      Wishlist
                    </Link>
                    <Link href="/buyer/cart" className="block text-gray-700 hover:text-primary-600" onClick={() => setMobileMenuOpen(false)}>
                      Cart ({itemCount})
                    </Link>
                    <Link href="/buyer/orders" className="block text-gray-700 hover:text-primary-600" onClick={() => setMobileMenuOpen(false)}>
                      Orders
                    </Link>
                  </>
                )}
                <Link href={user.role === 'seller' ? '/seller/profile' : '/buyer/profile'} className="block text-gray-700 hover:text-primary-600" onClick={() => setMobileMenuOpen(false)}>
                  Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left text-red-600 hover:text-red-700"
                >
                  Sign Out
                </button>
              </>
            )}
            {!user && (
              <>
                <Link href="/auth/login" className="block" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full btn-outline">Sign In</button>
                </Link>
                <Link href="/auth/signup" className="block" onClick={() => setMobileMenuOpen(false)}>
                  <button className="w-full btn-primary">Get Started</button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
