'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Product, supabase } from '@/lib/supabase'
import { Heart, ShoppingBag, Star, Store } from 'lucide-react'
import { useAuthStore, useCartStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { loadCart } = useCartStore()
  const [isAdding, setIsAdding] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [sellerRating, setSellerRating] = useState<{ avg: number; count: number } | null>(null)

  useEffect(() => {
    fetchSellerRating()
    if (user?.role === 'buyer') {
      checkWishlist()
    }
  }, [product.seller_id, user])

  const fetchSellerRating = async () => {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('rating')
        .eq('seller_id', product.seller_id)

      if (error) throw error
      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length
        setSellerRating({ avg: Math.round(avg * 10) / 10, count: data.length })
      }
    } catch (error) {
      // Silently fail - ratings table might not exist yet
    }
  }

  const checkWishlist = async () => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single()
      
      setIsWishlisted(!!data)
    } catch (error) {
      // Not in wishlist
    }
  }

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      toast.error('Please sign in to add to wishlist')
      router.push('/auth/login')
      return
    }

    if (user.role !== 'buyer') {
      toast.error('Only buyers can use wishlist')
      return
    }

    setWishlistLoading(true)
    try {
      if (isWishlisted) {
        // Remove from wishlist
        await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id)
        
        setIsWishlisted(false)
        toast.success('Removed from wishlist')
      } else {
        // Add to wishlist
        const { error } = await supabase
          .from('wishlist')
          .insert({
            user_id: user.id,
            product_id: product.id,
          })
        
        if (error) throw error
        setIsWishlisted(true)
        toast.success('Added to wishlist')
      }
    } catch (error: any) {
      if (error.code === '23505') {
        setIsWishlisted(true)
        toast.error('Already in wishlist')
      } else {
        toast.error('Failed to update wishlist')
      }
    } finally {
      setWishlistLoading(false)
    }
  }

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error('Please sign in to add items to cart')
      router.push('/auth/login')
      return
    }

    if (user.role !== 'buyer') {
      toast.error('Only buyers can add items to cart')
      return
    }

    setIsAdding(true)
    try {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: product.id,
          quantity: 1,
        })

      if (error) throw error
      
      // Reload cart to update count
      await loadCart(user.id)
      toast.success('Added to cart!')
      router.push('/buyer/cart')
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Item already in cart')
        router.push('/buyer/cart')
      } else {
        toast.error('Failed to add to cart')
      }
    } finally {
      setIsAdding(false)
    }
  }

  const imageUrl = product.images && product.images.length > 0 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/${product.images[0]}`
    : '/placeholder-product.jpg'

  return (
    <Link href={`/product/${product.id}`}>
      <div className="glass rounded-2xl sm:rounded-3xl overflow-hidden card-hover group cursor-pointer relative">
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-110 group-hover:rotate-2 transition-all duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-3 right-3 z-10">
            <button 
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              className={`glass p-2 rounded-full transition-all hover:scale-110 ${isWishlisted ? 'bg-red-50' : 'hover:bg-red-50'}`}
            >
              <Heart className={`w-5 h-5 transition-all ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-700 hover:text-red-500'}`} />
            </button>
          </div>
          {product.condition && product.is_available && (
            <div className="absolute top-3 left-3">
              <span className="bg-thrift-dark text-thrift-white text-xs px-3 py-1 rounded-full font-semibold">
                {product.condition}
              </span>
            </div>
          )}
          {!product.is_available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-600 text-white text-xl px-6 py-2 rounded-full font-bold transform -rotate-12">
                SOLD
              </span>
            </div>
          )}
        </div>
        
        <div className="p-3 sm:p-4">
          <h3 className="font-semibold text-base sm:text-lg text-thrift-dark mb-1 truncate">
            {product.title}
          </h3>
          <p className="text-thrift-gray text-xs sm:text-sm mb-2 line-clamp-2">
            {product.description}
          </p>

          {/* Seller Rating */}
          {sellerRating && (
            <div className="flex items-center gap-1 mb-2">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs sm:text-sm font-medium text-thrift-dark">{sellerRating.avg}</span>
              <span className="text-xs text-thrift-gray">({sellerRating.count})</span>
            </div>
          )}

          {/* Store Name */}
          {product.seller && (
            <div className="flex items-center gap-1 mb-2 text-thrift-gray">
              <Store className="w-3.5 h-3.5" />
              <span className="text-xs truncate">
                {(product.seller as any).store_name || product.seller.full_name}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-xl sm:text-2xl font-bold text-thrift-dark">
              ₱{product.price.toFixed(2)}
            </span>
            {product.size && (
              <span className="text-xs sm:text-sm text-thrift-gray bg-thrift-light px-2 py-1 rounded">
                {product.size}
              </span>
            )}
          </div>

          {user?.role === 'buyer' && (
            <button
              onClick={addToCart}
              disabled={isAdding || !product.is_available}
              className="w-full bg-thrift-dark text-thrift-white py-2 rounded-lg font-semibold hover:bg-black transition-smooth flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              <ShoppingBag className="w-4 h-4" />
              {!product.is_available ? 'Sold Out' : isAdding ? 'Adding...' : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
