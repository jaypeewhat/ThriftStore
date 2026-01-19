'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Mail, CheckCircle, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResendEmail = async () => {
    if (countdown > 0) return
    
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) throw error

      toast.success('Verification email sent!')
      setCountdown(60) // 60 second cooldown
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend email')
    } finally {
      setResending(false)
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

      <div className="max-w-md w-full glass rounded-3xl shadow-2xl p-8 text-center relative z-10">
        {/* Email Icon */}
        <div className="w-20 h-20 bg-thrift-light rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10 text-thrift-dark" />
        </div>

        <h1 className="text-3xl font-bold text-thrift-dark mb-2">
          Check Your Email
        </h1>
        
        <p className="text-thrift-gray mb-6">
          We've sent a verification link to
        </p>

        <div className="bg-thrift-light rounded-xl p-4 mb-6">
          <p className="font-semibold text-thrift-dark break-all">{email}</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3 text-left">
            <div className="w-8 h-8 bg-thrift-dark rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-sm font-bold">1</span>
            </div>
            <div>
              <p className="font-semibold text-thrift-dark">Open your email</p>
              <p className="text-sm text-thrift-gray">Check your inbox (and spam folder)</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 text-left">
            <div className="w-8 h-8 bg-thrift-dark rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-sm font-bold">2</span>
            </div>
            <div>
              <p className="font-semibold text-thrift-dark">Click the verification link</p>
              <p className="text-sm text-thrift-gray">It will confirm your email address</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 text-left">
            <div className="w-8 h-8 bg-thrift-dark rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-sm font-bold">3</span>
            </div>
            <div>
              <p className="font-semibold text-thrift-dark">Come back and sign in</p>
              <p className="text-sm text-thrift-gray">Start shopping or selling!</p>
            </div>
          </div>
        </div>

        {/* Resend Button */}
        <button
          onClick={handleResendEmail}
          disabled={resending || countdown > 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-thrift-light text-thrift-dark rounded-xl font-semibold hover:bg-thrift-gray hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {resending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sending...
            </>
          ) : countdown > 0 ? (
            <>
              <RefreshCw className="w-5 h-5" />
              Resend in {countdown}s
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Resend Verification Email
            </>
          )}
        </button>

        <Link href="/auth/login">
          <button className="w-full btn-primary flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            I've Verified - Sign In
          </button>
        </Link>

        <Link href="/auth/signup" className="inline-flex items-center gap-2 text-thrift-gray hover:text-thrift-dark mt-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Sign Up
        </Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-thrift-dark" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
