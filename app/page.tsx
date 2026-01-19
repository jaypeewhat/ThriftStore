'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import Navbar from '@/components/Navbar'
import ProductGrid from '@/components/ProductGrid'
import Hero from '@/components/Hero'
import { supabase, Product } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { user, isLoading } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If user is logged in, redirect based on role
    if (!isLoading && user) {
      if (user.role === 'seller') {
        router.push('/seller/dashboard')
      } else {
        router.push('/shop')
      }
      return
    }
    fetchProducts()
  }, [user, isLoading, router])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles(id, full_name, avatar_url, store_name)
        `)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || (user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-thrift-white">
      <Navbar />
      <Hero />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-thrift-dark mb-4">
            Latest Finds ✨
          </h2>
          <p className="text-lg text-thrift-gray">
            Discover unique pre-loved fashion pieces
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
    </main>
  )
}
