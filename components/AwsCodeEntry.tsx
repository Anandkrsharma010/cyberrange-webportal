'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from '@/lib/api'
import { CheckCircle, Clock, Mail, Key, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AwsCodeEntryProps {
  labId: string
  userEmail: string
  className?: string
}

interface AwsLabStatus {
  purchased: boolean
  codeSent: boolean
  codeSentAt?: string
  codeEntered: boolean
  codeEnteredAt?: string
  accessGranted: boolean
  subscriptionExpires?: string
  isExpired: boolean
  purchaseId?: string
}

export default function AwsCodeEntry({ labId, userEmail, className = '' }: AwsCodeEntryProps) {
  const [status, setStatus] = useState<AwsLabStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const { toast } = useToast()

  // Only show for AWS Security Labs
  if (labId !== 'aws-security-labs') {
    return null
  }

  // Fetch AWS lab status
  const fetchStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiClient.getAwsLabStatus()
      
      if (response.success && response.data) {
        setStatus(response.data)
        
        // Calculate time remaining if code was sent
        if (response.data.codeSent && response.data.codeSentAt && !response.data.codeEntered) {
          const sentAt = new Date(response.data.codeSentAt)
          const expiryTime = new Date(sentAt.getTime() + 5 * 60 * 1000) // 5 minutes
          const now = new Date()
          const secondsRemaining = Math.max(0, Math.floor((expiryTime.getTime() - now.getTime()) / 1000))
          setTimeRemaining(secondsRemaining)
        }
      } else {
        // If response says not purchased, that's fine - don't show error
        if (response.message && response.message.includes('not purchased')) {
          setStatus(null)
        } else {
          // Other errors - show helpful message
          setError(response.message || 'Failed to load AWS lab status')
          setStatus(null)
        }
      }
    } catch (err: any) {
      console.error('Error fetching AWS lab status:', err)
      setError('Failed to connect to server. Please refresh the page.')
      setStatus(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Update countdown timer
  useEffect(() => {
    if (!status || !status.codeSent || status.codeEntered || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Code expired
          fetchStatus()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [status, timeRemaining])

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading && !isVerifying) {
        fetchStatus()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isLoading, isVerifying])

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Expired'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  // Verify access code
  const handleVerifyCode = async () => {
    if (!code || code.trim().length === 0) {
      setError('Please enter the access code')
      return
    }

    try {
      setIsVerifying(true)
      setError(null)
      
      const response = await apiClient.verifyAwsAccessCode(code.trim())
      
      if (response.success) {
        toast({
          title: 'Access Granted!',
          description: 'You now have full access to AWS Security Labs',
          variant: 'default',
        })
        // Refresh status
        await fetchStatus()
      } else {
        const errorMsg = response.message || 'Invalid access code'
        setError(errorMsg)
        toast({
          title: 'Verification Failed',
          description: errorMsg,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      console.error('Error verifying code:', err)
      const errorMsg = 'Failed to verify access code. Please try again.'
      setError(errorMsg)
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsVerifying(false)
    }
  }

  // Resend access code
  const handleResendCode = async () => {
    try {
      setIsResending(true)
      setError(null)
      
      const response = await apiClient.resendAwsAccessCode()
      
      if (response.success) {
        toast({
          title: 'Code Resent',
          description: 'New access code sent to your email',
          variant: 'default',
        })
        // Refresh status
        await fetchStatus()
        setCode('') // Clear previous code
      } else {
        toast({
          title: 'Resend Failed',
          description: response.message || 'Failed to resend code',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      console.error('Error resending code:', err)
      toast({
        title: 'Error',
        description: 'Failed to resend access code',
        variant: 'destructive',
      })
    } finally {
      setIsResending(false)
    }
  }

  if (isLoading) {
    return (
      <Card className={cn("rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-lg", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  // If status loaded but not purchased, hide component
  // (Only show component if purchased OR still loading)
  if (!status.purchased) {
    return null
  }

  // Access Granted State
  if (status.accessGranted && !status.isExpired) {
    const expiryDate = status.subscriptionExpires ? new Date(status.subscriptionExpires) : null
    const daysRemaining = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0

    return (
      <Card className={cn("rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-lg", className)}>
        <CardHeader className="pb-3 border-b border-white/10">
          <CardTitle className="flex items-center space-x-2 text-lg text-white font-bold">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>AWS Labs Access</span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Full access to AWS Security Labs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <div>
                <h3 className="text-xl font-bold text-emerald-305">Access Granted</h3>
                <p className="text-sm text-emerald-500">Subscription active</p>
              </div>
            </div>
            
            <div className="bg-black/40 border border-white/10 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-medium text-slate-200">{userEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Access granted:</span>
                  <span className="font-medium text-slate-200">
                    {status.codeEntered && new Date(status.codeEnteredAt || '').toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Valid until:</span>
                  <span className="font-medium text-slate-200">
                    {expiryDate?.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Days remaining:</span>
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 font-bold">
                    {daysRemaining} days
                  </Badge>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold transition-all shadow-lg rounded-xl"
              onClick={() => {
                const token = localStorage.getItem('cystar_token') || '';
                const purchaseId = status?.purchaseId || '';
                const awsLabBaseUrl = process.env.NEXT_PUBLIC_AWS_LAB_URL || 'http://localhost:3000';
                window.location.href = `${awsLabBaseUrl}/?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userEmail)}&purchaseId=${encodeURIComponent(purchaseId)}`;
              }}
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Access AWS Security Labs
            </Button>
            
            <p className="text-xs text-slate-400 mt-4 text-center">
              7 hands-on labs • Secure PDF viewer • Full access
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Subscription Expired State
  if (status.isExpired) {
    return (
      <Card className={cn("rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-lg", className)}>
        <CardHeader className="pb-3 border-b border-white/10">
          <CardTitle className="flex items-center space-x-2 text-lg text-white font-bold">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span>AWS Labs Access</span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Subscription expired
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-300 mb-2">Subscription Expired</h3>
            <p className="text-sm text-red-400 mb-4 font-light">
              Your 30-day access has ended. Renew to continue learning.
            </p>
            <Button
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              onClick={() => {
                window.location.href = '/labs';
              }}
            >
              Renew Subscription
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Code Entry State (code sent but not entered)
  if (status.codeSent && !status.codeEntered) {
    const codeExpired = timeRemaining <= 0

    return (
      <Card className={cn("rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-lg", className)}>
        <CardHeader className="pb-3 border-b border-white/10">
          <CardTitle className="flex items-center space-x-2 text-lg text-white font-bold">
            <Key className="w-5 h-5 text-blue-400" />
            <span>AWS Labs Access Code</span>
          </CardTitle>
          <CardDescription className="text-slate-400">
            Enter the code sent to your email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {/* Email notification */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-blue-300 mb-1">
                  Access code sent to your email
                </p>
                <p className="text-sm text-blue-200">
                  <strong>{userEmail}</strong>
                </p>
                <p className="text-xs text-blue-450 mt-2">
                  Check your inbox (and spam folder) for the access code.
                </p>
              </div>
            </div>
          </div>

          {/* Timer or expired state */}
          {!codeExpired ? (
            <div className={cn("rounded-xl p-3 border", 
              timeRemaining > 120 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : timeRemaining > 60 
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
            )}>
              <div className="flex items-center justify-center space-x-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-semibold">
                  Code valid for: {formatTimeRemaining(timeRemaining)}
                </span>
              </div>
            </div>
          ) : (
            <Alert className="bg-red-500/10 border-red-500/20 text-red-400 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <AlertDescription>
                Code expired. Click "Resend Code" to get a new one.
              </AlertDescription>
            </Alert>
          )}

          {/* Code entry form */}
          {!codeExpired && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-350 mb-2 block">
                  Enter Access Code
                </label>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  className="text-center text-lg font-mono tracking-wider bg-black/40 border border-white/10 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl"
                  disabled={isVerifying}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleVerifyCode()
                    }
                  }}
                />
              </div>

              {error && (
                <Alert className="bg-red-500/10 border-red-500/20 text-red-400 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleVerifyCode}
                disabled={isVerifying || code.trim().length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg rounded-xl"
                size="lg"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5 mr-2" />
                    Verify Code
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Resend code button */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-sm text-slate-400 mb-3 text-center">
              Didn't receive the email?
            </p>
            <Button
              variant="outline"
              onClick={handleResendCode}
              disabled={isResending}
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Resending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Code
                </>
              )}
            </Button>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Check spam folder • Wait 1-2 minutes
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4">
            <h4 className="font-semibold text-slate-200 mb-2 text-sm">How it works:</h4>
            <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside leading-relaxed font-light">
              <li>Check your email for the access code</li>
              <li>Enter the code above (valid for 5 minutes)</li>
              <li>Click "Verify Code"</li>
              <li>Access granted! Login anytime for 30 days</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Waiting for purchase or code to be sent, or error state
  // Also handle case where AWS API failed during purchase
  const showApiError = status && !status.codeSent && status.purchased;
  
  return (
    <Card className={cn("rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-lg", className)}>
      <CardHeader className="pb-3 border-b border-white/10">
        <CardTitle className="flex items-center space-x-2 text-lg text-white font-bold">
          <Key className="w-5 h-5 text-slate-400" />
          <span>AWS Labs Access</span>
        </CardTitle>
        <CardDescription className="text-slate-400">
          {error ? 'Error loading status' : showApiError ? 'Access code generation failed' : 'Waiting for access code'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {error ? (
          <div className="text-center py-6">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-red-400 mb-4">{error}</p>
            <Button
              onClick={fetchStatus}
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : showApiError ? (
          <div className="text-center py-6">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="text-sm text-amber-300 mb-2 font-bold">
              Access code was not sent automatically
            </p>
            <p className="text-xs text-slate-450 mb-4 leading-relaxed font-light">
              The AWS API endpoint failed when processing your payment. Click below to generate and send the access code manually.
            </p>
            <Button
              onClick={handleResendCode}
              disabled={isResending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg rounded-xl"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Generate & Send Code
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-6">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
            <p className="text-sm text-slate-350 mb-2 font-medium">
              Processing your purchase...
            </p>
            <p className="text-xs text-slate-400">
              If you just completed payment, check your email ({userEmail}) in 1-2 minutes.
            </p>
            <Button
              onClick={fetchStatus}
              variant="outline"
              size="sm"
              className="mt-4 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-xl"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

