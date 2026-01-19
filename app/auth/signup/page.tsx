'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, User as UserIcon, Loader2, ShoppingBag, Store, FileText, MapPin } from 'lucide-react'

type UserRole = 'buyer' | 'seller'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('buyer')
  const [loading, setLoading] = useState(false)
  
  // Store details for sellers
  const [storeName, setStoreName] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [storeAddress, setStoreAddress] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate store details for sellers
    if (role === 'seller' && !storeName.trim()) {
      toast.error('Please enter your store name')
      return
    }
    
    setLoading(true)

    try {
      // Sign up user with metadata - trigger will create profile automatically
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            store_name: role === 'seller' ? storeName : null,
            store_description: role === 'seller' ? storeDescription : null,
            address: role === 'seller' ? storeAddress : null,
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Redirect to verify email page
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-thrift-white via-thrift-light to-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gray-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-gray-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-96 h-96 bg-gray-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="max-w-md w-full glass rounded-3xl shadow-2xl p-8 animate-float relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-thrift-dark mb-2">
            Get Started
          </h1>
          <p className="text-gray-600">Create your account</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              I want to...
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`p-4 border-2 rounded-2xl transition-all transform hover:scale-105 ${
                  role === 'buyer'
                    ? 'border-thrift-dark bg-thrift-light shadow-lg'
                    : 'border-gray-200 hover:border-thrift-gray bg-thrift-white'
                }`}
              >
                <ShoppingBag className={`w-8 h-8 mx-auto mb-2 ${
                  role === 'buyer' ? 'text-thrift-dark' : 'text-thrift-gray'
                }`} />
                <p className={`font-semibold ${
                  role === 'buyer' ? 'text-thrift-dark' : 'text-thrift-gray'
                }`}>
                  Buy
                </p>
              </button>
              <button
                type="button"
                onClick={() => setRole('seller')}
                className={`p-4 border-2 rounded-2xl transition-all transform hover:scale-105 ${
                  role === 'seller'
                    ? 'border-thrift-dark bg-thrift-light shadow-lg'
                    : 'border-gray-200 hover:border-thrift-gray bg-thrift-white'
                }`}
              >
                <Store className={`w-8 h-8 mx-auto mb-2 ${
                  role === 'seller' ? 'text-thrift-dark' : 'text-thrift-gray'
                }`} />
                <p className={`font-semibold ${
                  role === 'seller' ? 'text-thrift-dark' : 'text-thrift-gray'
                }`}>
                  Sell
                </p>
              </button>
            </div>
          </div>

          {/* Store Details - Only for Sellers */}
          {role === 'seller' && (
            <div className="space-y-4 p-4 bg-thrift-light/50 rounded-2xl border-2 border-dashed border-thrift-gray/30">
              <div className="flex items-center gap-2 mb-2">
                <Store className="w-5 h-5 text-thrift-dark" />
                <h3 className="font-semibold text-thrift-dark">Store Details</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Name *
                </label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="My Thrift Store"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Description
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={storeDescription}
                    onChange={(e) => setStoreDescription(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    placeholder="Tell buyers about your store..."
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Store location (for pickup orders)"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary-600 hover:text-primary-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
