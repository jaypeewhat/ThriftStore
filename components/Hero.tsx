'use client'

import Link from 'next/link'
import { Sparkles, TrendingUp, Recycle } from 'lucide-react'

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-thrift-white via-thrift-light to-gray-100 py-20 min-h-[600px] flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-thrift-dark mb-6">
            Sustainable Fashion
            <span className="block text-thrift-dark">
              Starts Here
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-thrift-gray mb-10 max-w-3xl mx-auto">
            Discover unique pre-loved clothing and give fashion a second life. 
            Shop sustainably, save money, and look amazing! ✨
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/auth/signup">
              <button className="btn-primary text-lg px-8 py-4">
                Start Shopping
              </button>
            </Link>
            <Link href="/auth/signup">
              <button className="btn-secondary text-lg px-8 py-4">
                Become a Seller
              </button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="group glass rounded-3xl p-8 card-hover animate-float">
              <div className="shimmer absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-16 h-16 bg-thrift-dark rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <Sparkles className="w-8 h-8 text-thrift-white group-hover:rotate-12 transition-transform" />
              </div>
              <h3 className="text-xl font-bold text-thrift-dark mb-2">Unique Finds</h3>
              <p className="text-thrift-gray">
                Discover one-of-a-kind pieces you won't find anywhere else
              </p>
            </div>

            <div className="group glass rounded-3xl p-8 card-hover animate-float animation-delay-2000">
              <div className="shimmer absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-16 h-16 bg-thrift-gray rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <TrendingUp className="w-8 h-8 text-thrift-white group-hover:rotate-12 transition-transform" />
              </div>
              <h3 className="text-xl font-bold text-thrift-dark mb-2">Great Prices</h3>
              <p className="text-thrift-gray">
                Quality fashion at affordable prices that won't break the bank
              </p>
            </div>

            <div className="group glass rounded-3xl p-8 card-hover animate-float animation-delay-4000">
              <div className="shimmer absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-16 h-16 bg-thrift-dark rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <Recycle className="w-8 h-8 text-thrift-white group-hover:rotate-12 transition-transform" />
              </div>
              <h3 className="text-xl font-bold text-thrift-dark mb-2">Eco-Friendly</h3>
              <p className="text-thrift-gray">
                Reduce waste and contribute to a more sustainable future
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gray-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-gray-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-gray-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
    </div>
  )
}
