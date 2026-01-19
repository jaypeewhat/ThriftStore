'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore, useCartStore } from '@/lib/store'
import { supabase, Product } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Loader2, ShoppingCart, Heart, Package, Star, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import Image from 'next/image'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const { addItem } = useCartStore()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [addingToCart, setAddingToCart] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)
  const [sellerRating, setSellerRating] = useState<{ average: number; count: number } | null>(null)

  useEffect(() => {
    fetchProduct()
  }, [params.id])

  useEffect(() => {
    if (user?.role === 'buyer' && product) {
      checkWishlist()
    }
  }, [user, product])

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles(id, full_name, avatar_url, store_name, store_description)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setProduct(data)
      
      // Fetch seller rating
      if (data?.seller_id) {
        const { data: ratings } = await supabase
          .from('ratings')
          .select('rating')
          .eq('seller_id', data.seller_id)
        
        if (ratings && ratings.length > 0) {
          const average = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          setSellerRating({ average, count: ratings.length })
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      toast.error('Product not found')
      router.push('/shop')
    } finally {
      setLoading(false)
    }
  }

  const checkWishlist = async () => {
    if (!user || !product) return
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

  const toggleWishlist = async () => {
    if (!user) {
      toast.error('Please login to add to wishlist')
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
        await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product!.id)
        
        setIsWishlisted(false)
        toast.success('Removed from wishlist')
      } else {
        const { error } = await supabase
          .from('wishlist')
          .insert({
            user_id: user.id,
            product_id: product!.id,
          })
        
        if (error) throw error
        setIsWishlisted(true)
        toast.success('Added to wishlist')
      }
    } catch (error: any) {
      if (error.code === '23505') {
        setIsWishlisted(true)
      } else {
        toast.error('Failed to update wishlist')
      }
    } finally {
      setWishlistLoading(false)
    }
  }

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Please login to add items to cart')
      router.push('/auth/login')
      return
    }

    if (user.role === 'seller') {
      toast.error('Sellers cannot purchase items')
      return
    }

    if (!product?.is_available) {
      toast.error('This item is sold out')
      return
    }

    setAddingToCart(true)
    try {
      await addItem(product!)
      toast.success('Added to cart!')
      router.push('/buyer/cart')
    } catch (error: any) {
      if (error.message === 'Item already in cart') {
        toast.error('Item already in cart')
        router.push('/buyer/cart')
      } else {
        toast.error('Failed to add to cart')
      }
    } finally {
      setAddingToCart(false)
    }
  }

  const getImageUrl = (imagePath: string) => {
    const { data } = supabase.storage.from('products').getPublicUrl(imagePath)
    return data.publicUrl
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-thrift-white">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-12 h-12 animate-spin text-thrift-gray" />
        </div>
      </div>
    )
  }

  if (!product) {
    return null
  }

  return (
    <div className="min-h-screen bg-thrift-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images Section */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
              <img
                src={getImageUrl(product.images[selectedImageIndex])}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Thumbnail Images */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === index ? 'border-thrift-dark' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={getImageUrl(image)}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="space-y-6">
            {/* Title and Price */}
            <div>
              <h1 className="text-4xl font-bold text-thrift-dark mb-2">
                {product.title}
              </h1>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-thrift-dark">
                  ₱{product.price.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="glass rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-thrift-gray mb-1">Category</p>
                  <p className="font-semibold text-thrift-dark">{product.category}</p>
                </div>
                <div>
                  <p className="text-sm text-thrift-gray mb-1">Size</p>
                  <p className="font-semibold text-thrift-dark">{product.size}</p>
                </div>
                <div>
                  <p className="text-sm text-thrift-gray mb-1">Condition</p>
                  <p className="font-semibold text-thrift-dark">{product.condition}</p>
                </div>
                <div>
                  <p className="text-sm text-thrift-gray mb-1">Availability</p>
                  <p className={`font-semibold ${product.is_available ? 'text-green-600' : 'text-red-600'}`}>
                    {product.is_available ? 'In Stock' : 'Sold Out'}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold text-thrift-dark mb-3">Description</h2>
              <p className="text-thrift-gray leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>

            {/* Seller/Store Info */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-thrift-dark rounded-full flex items-center justify-center">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-thrift-gray">Sold by</p>
                    <p className="font-semibold text-thrift-dark">
                      {(product.seller as any)?.store_name || product.seller?.full_name || 'Unknown Store'}
                    </p>
                  </div>
                </div>
                {sellerRating && (
                  <div className="flex items-center gap-1 bg-thrift-light px-3 py-2 rounded-xl">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-thrift-dark">{sellerRating.average.toFixed(1)}</span>
                    <span className="text-sm text-thrift-gray">({sellerRating.count})</span>
                  </div>
                )}
              </div>
              {(product.seller as any)?.store_description && (
                <p className="mt-3 text-sm text-thrift-gray border-t border-thrift-light pt-3">
                  {(product.seller as any).store_description}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {product.is_available && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart || user?.id === product.seller_id}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {addingToCart ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5" />
                        Add to Cart
                      </>
                    )}
                  </button>
                  <button
                    onClick={toggleWishlist}
                    disabled={wishlistLoading || user?.role !== 'buyer'}
                    className={`px-4 py-3 rounded-xl border-2 transition-all disabled:opacity-50 ${
                      isWishlisted 
                        ? 'bg-red-50 border-red-300 text-red-500' 
                        : 'bg-white border-thrift-light text-thrift-gray hover:border-red-300 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-red-500' : ''}`} />
                  </button>
                </div>
                {user?.id === product.seller_id && (
                  <p className="text-center text-sm text-thrift-gray">
                    This is your product
                  </p>
                )}
              </div>
            )}
            {!product.is_available && (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 font-semibold text-center">
                    This item is no longer available
                  </p>
                </div>
                {user?.role === 'buyer' && (
                  <button
                    onClick={toggleWishlist}
                    disabled={wishlistLoading}
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                      isWishlisted 
                        ? 'bg-red-50 border-red-300 text-red-500' 
                        : 'bg-white border-thrift-light text-thrift-gray hover:border-red-300 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500' : ''}`} />
                    {isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  </button>
                )}
              </div>
            )}

            {/* Features */}
            <div className="border-t pt-6 space-y-3">
              <div className="flex items-center gap-3 text-thrift-gray">
                <Package className="w-5 h-5" />
                <span>Carefully packaged and shipped</span>
              </div>
              <div className="flex items-center gap-3 text-thrift-gray">
                <Heart className="w-5 h-5" />
                <span>Pre-loved with care</span>
              </div>
              <div className="flex items-center gap-3 text-thrift-gray">
                <Star className="w-5 h-5" />
                <span>Quality inspected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
