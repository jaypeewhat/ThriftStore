'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import ProductGrid from '@/components/ProductGrid'
import { supabase, Product } from '@/lib/supabase'
import { useAuthStore } from '@/lib/store'
import { Loader2, Search, SlidersHorizontal } from 'lucide-react'

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories', 'Others']
const SIZES = ['All', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size']
const CONDITIONS = ['All', 'Like New', 'Excellent', 'Good', 'Fair']

export default function ShopPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedSize, setSelectedSize] = useState('All')
  const [selectedCondition, setSelectedCondition] = useState('All')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    // Redirect admin to dashboard
    if (user?.role === 'admin') {
      router.push('/admin/dashboard')
      return
    }
    fetchProducts()
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [products, searchQuery, selectedCategory, selectedSize, selectedCondition])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles(id, full_name, avatar_url, store_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...products]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    // Size filter
    if (selectedSize !== 'All') {
      filtered = filtered.filter(product => product.size === selectedSize)
    }

    // Condition filter
    if (selectedCondition !== 'All') {
      filtered = filtered.filter(product => product.condition === selectedCondition)
    }

    setFilteredProducts(filtered)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('All')
    setSelectedSize('All')
    setSelectedCondition('All')
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

  return (
    <div className="min-h-screen bg-thrift-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-thrift-dark mb-2">Shop All Items</h1>
          <p className="text-thrift-gray text-sm sm:text-base">Discover unique pre-loved fashion pieces</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-thrift-gray" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for items..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-thrift-light transition-colors"
          >
            <SlidersHorizontal className="w-5 h-5" />
            Filters
          </button>

          {/* Filters */}
          {showFilters && (
            <div className="glass rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-thrift-dark">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-thrift-gray hover:text-thrift-dark transition-colors"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-thrift-dark mb-2">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Size Filter */}
                <div>
                  <label className="block text-sm font-medium text-thrift-dark mb-2">
                    Size
                  </label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                  >
                    {SIZES.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                {/* Condition Filter */}
                <div>
                  <label className="block text-sm font-medium text-thrift-dark mb-2">
                    Condition
                  </label>
                  <select
                    value={selectedCondition}
                    onChange={(e) => setSelectedCondition(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-thrift-gray focus:border-transparent"
                  >
                    {CONDITIONS.map(cond => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-thrift-gray">
          Showing {filteredProducts.length} of {products.length} items
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <ProductGrid products={filteredProducts} />
        ) : (
          <div className="text-center py-16">
            <p className="text-thrift-gray text-lg">No products found matching your filters</p>
            <button
              onClick={clearFilters}
              className="mt-4 btn-outline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
