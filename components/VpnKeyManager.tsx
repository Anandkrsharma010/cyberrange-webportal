'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, RefreshCw, Key, Clock, AlertCircle, CheckCircle, Play, Info } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface VpnKeyData {
  key?: string
  keyId?: string
  loginLink?: string
  mobileLoginUrl?: string
  expiresAt: string
  timeRemaining: number
  isUsed?: boolean
}

interface VpnKeyManagerProps {
  labId: string
  className?: string
}

export default function VpnKeyManager({ labId, className = '' }: VpnKeyManagerProps) {
  const [vpnKey, setVpnKey] = useState<VpnKeyData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Only show for CRAPI lab
  if (labId !== 'crapi') {
    return null
  }

  // Fetch current VPN key
  const fetchVpnKey = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiClient.getCurrentVpnKey()
      
      if (response.success && response.data) {
        setVpnKey(response.data)
        // Calculate time remaining from expiresAt for accuracy, cap at 5 minutes
        const expiresAt = new Date(response.data.expiresAt)
        const now = new Date()
        const secondsRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
        // Cap at 5 minutes (300 seconds) max
        setTimeRemaining(Math.min(secondsRemaining, 300))
      } else {
        setVpnKey(null)
        const msg = response.message || 'No active VPN key found'
        setError(msg)
      }
    } catch (err: any) {
      console.error('Error fetching VPN key:', err)
      setError('Failed to load VPN key')
      setVpnKey(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate new VPN key
  const generateVpnKey = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      
      const response = await apiClient.generateVpnKey()
      
      if (response.success && response.data) {
        setVpnKey(response.data)
        // Calculate time remaining from expiresAt for accuracy, cap at 5 minutes
        const expiresAt = new Date(response.data.expiresAt)
        const now = new Date()
        const secondsRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
        // Cap at 5 minutes (300 seconds) max
        setTimeRemaining(Math.min(secondsRemaining, 300))
        toast({
          title: 'VPN Key Generated',
          description: 'Connect to Tailscale using this key to access the lab',
        })
      } else {
        const errorMsg = response.message || 'Failed to generate VPN key'
        setError(errorMsg)
        toast({
          title: 'Generation Failed',
          description: errorMsg,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      console.error('Error generating VPN key:', err)
      const errorMessage = err.response?.data?.message || 'Failed to generate VPN key'
      setError(errorMessage)
      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Copy key to clipboard
  const copyToClipboard = async () => {
    if (!vpnKey?.key) return

    try {
      await navigator.clipboard.writeText(vpnKey.key)
      setCopied(true)
      toast({
        title: 'Copied to Clipboard',
        description: 'VPN key has been copied to your clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      })
    }
  }

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Expired'
    
    // Cap at 5 minutes (300 seconds) maximum for display
    const cappedSeconds = Math.min(seconds, 300)
    
    // If value is way too large, show as "~5m" instead
    if (seconds > 600) {
      return '~5m (checking...)'
    }
    
    const minutes = Math.floor(cappedSeconds / 60)
    const remainingSeconds = Math.floor(cappedSeconds % 60)
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${remainingSeconds}s`
    }
  }

  // Update countdown timer - recalculate from expiresAt every second for accuracy
  useEffect(() => {
    if (!vpnKey || !vpnKey.expiresAt) return

    const timer = setInterval(() => {
      const expiresAt = new Date(vpnKey.expiresAt)
      const now = new Date()
      const secondsRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
      
      if (secondsRemaining <= 0) {
        // Key expired, fetch new status
        fetchVpnKey()
        setTimeRemaining(0)
      } else {
        // Cap at 5 minutes (300 seconds) max
        setTimeRemaining(Math.min(secondsRemaining, 300))
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [vpnKey])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading && !isGenerating) {
        fetchVpnKey()
      }
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [isLoading, isGenerating])

  // Initial fetch
  useEffect(() => {
    fetchVpnKey()
  }, [])

  // Determine status - Only show connected if key was actually used (Tailscale connected)
  const getStatus = () => {
    if (isLoading || isGenerating) return 'loading'
    // Only show connected if key is marked as used (Tailscale connection verified)
    if (vpnKey?.isUsed === true) return 'connected'
    if (error) return 'error'
    if (vpnKey && timeRemaining > 0) return 'active'
    if (vpnKey && timeRemaining <= 0) return 'expired'
    return 'empty'
  }

  const status = getStatus()

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Key className="w-5 h-5 text-blue-600" />
          <span>VPN Access Key</span>
        </CardTitle>
        <CardDescription>
          Secure VPN key for accessing CRAPI lab environment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading VPN key...</span>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-gray-600">{error}</p>
            <Button 
              onClick={generateVpnKey} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Generate VPN Key
                </>
              )}
            </Button>
          </div>
        )}

        {status === 'empty' && (
          <div className="space-y-3">
              <p className="text-sm text-gray-600">
                No VPN key available. Generate one to access your lab environment.
              </p>
            <Button 
              onClick={generateVpnKey} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 mr-2" />
                  Generate VPN Key
                </>
              )}
            </Button>
          </div>
        )}

        {status === 'expired' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Key Expired</span>
            </div>
            {error && error.includes('already used') ? (
              <>
                <p className="text-sm text-red-600 font-medium">
                  Lab access was already used. One-time key cannot be regenerated after use.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs text-red-700">
                    You successfully accessed the lab using this key. Regeneration is not allowed after usage.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700">
                  Key expired. You can generate a new key since this one was never marked as used.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700 mb-2">
                    💡 <strong>Tip:</strong> If you successfully accessed the lab, make sure to mark the key as "Used" after expiry to prevent regeneration.
                  </p>
                </div>
                <Button 
                  onClick={generateVpnKey} 
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Generate New Key
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {status === 'connected' && (
          // Lab Connected State - Only shown when key is marked as used (Tailscale connected)
          <div className="space-y-4">
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="text-xl font-bold text-green-900">Tailscale Connected</h3>
                  <p className="text-sm text-green-700">VPN key was used - Tailscale connection verified</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 mb-2">Access your lab at:</p>
                <a 
                  href={process.env.NEXT_PUBLIC_CRAPI_URL || 'http://100.70.24.37:8888'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-mono text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {process.env.NEXT_PUBLIC_CRAPI_URL || 'http://100.70.24.37:8888'}
                </a>
              </div>
              <Button
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                onClick={() => {
                  const crapiUrl = process.env.NEXT_PUBLIC_CRAPI_URL || 'http://100.70.24.37:8888';
                  window.open(crapiUrl, '_blank');
                }}
              >
                <Play className="w-5 h-5 mr-2" />
                Open Lab
              </Button>
              <p className="text-xs text-gray-600 mt-4 text-center">
                ✓ Tailscale VPN connection verified. Lab is now accessible.
              </p>
            </div>
          </div>
        )}

        {status === 'active' && vpnKey && (
          <div className="space-y-4">
            {/* Show Connection Instructions - User must connect to Tailscale first */}
            <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-600">Active</span>
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Expires in 5 minutes
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                      One-time key • Cannot generate new
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTimeRemaining(timeRemaining)}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {/* Mobile users - Invite link */}
                  {vpnKey.mobileLoginUrl && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        📱 Mobile Users
                      </h3>
                      <p className="text-sm text-gray-700 mb-3">
                        Click the button below to connect automatically via Tailscale app.
                      </p>
                      <Button
                        size="lg"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => {
                          if (vpnKey.mobileLoginUrl) {
                            window.open(vpnKey.mobileLoginUrl, '_blank')
                          }
                        }}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Connect to VPN
                      </Button>
                      <p className="text-xs text-gray-600 mt-2 text-center">
                        Opens Tailscale app and connects automatically
                      </p>
                    </div>
                  )}

                  {/* Desktop users - CLI method */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      🖥️ Desktop Users (Windows/Mac/Linux)
                    </h3>
                    <div className="space-y-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-900 mb-2"><strong>Step-by-step:</strong></p>
                        <ol className="list-decimal list-inside space-y-3 text-gray-700">
                          <li>
                            <strong>Download & Install Tailscale</strong><br />
                            → <a href="https://tailscale.com/download" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://tailscale.com/download</a>
                          </li>
                          <li>
                            <strong>Open Command Prompt (Windows) or Terminal (Mac/Linux) as Admin</strong>
                          </li>
                          <li>
                            <strong>Copy the VPN key below:</strong>
                            <div className="mt-2 bg-white border border-gray-300 rounded-lg p-3 flex items-center justify-between">
                              <code className="text-xs font-mono text-gray-800 flex-1 break-all">
                                {vpnKey.key}
                              </code>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={copyToClipboard}
                                className="ml-2"
                              >
                                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                            {vpnKey.expiresAt && (
                              <p className="text-xs text-gray-600 mt-1">
                                Expires: {new Date(vpnKey.expiresAt).toLocaleTimeString()}
                              </p>
                            )}
                          </li>
                          <li>
                            <strong>Run this command (copy & paste):</strong>
                            <div className="mt-2 space-y-2">
                              <div>
                                <p className="text-xs text-gray-600 mb-1"><strong>Windows:</strong></p>
                                <pre className="bg-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto border">
                                  <span className="select-all">"C:\Program Files\Tailscale\tailscale.exe" up --authkey={vpnKey.key} --login-server=https://controlplane.tailscale.com --force-reauth</span>
                                </pre>
                              </div>
                              <div>
                                <p className="text-xs text-gray-600 mb-1"><strong>Mac/Linux:</strong></p>
                                <pre className="bg-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto border">
                                  <span className="select-all">sudo tailscale up --authkey={vpnKey.key} --login-server=https://controlplane.tailscale.com --force-reauth</span>
                                </pre>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const command = `"C:\\Program Files\\Tailscale\\tailscale.exe" up --authkey=${vpnKey.key} --login-server=https://controlplane.tailscale.com --force-reauth`;
                                      if (navigator.clipboard && navigator.clipboard.writeText) {
                                        await navigator.clipboard.writeText(command)
                                      } else {
                                        const textArea = document.createElement('textarea')
                                        textArea.value = command
                                        document.body.appendChild(textArea)
                                        textArea.select()
                                        document.execCommand('copy')
                                        document.body.removeChild(textArea)
                                      }
                                      setCopied(true)
                                      setTimeout(() => setCopied(false), 2000)
                                      toast({
                                        title: 'Copied!',
                                        description: 'Windows command copied to clipboard.',
                                        variant: 'default',
                                      })
                                    } catch (error) {
                                      console.error('Failed to copy:', error)
                                      toast({
                                        title: 'Copy Failed',
                                        description: 'Please copy the command manually.',
                                        variant: 'destructive',
                                      })
                                    }
                                  }}
                                >
                                  {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                  Copy (Windows)
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const command = `sudo tailscale up --authkey=${vpnKey.key} --login-server=https://controlplane.tailscale.com --force-reauth`;
                                      if (navigator.clipboard && navigator.clipboard.writeText) {
                                        await navigator.clipboard.writeText(command)
                                      } else {
                                        const textArea = document.createElement('textarea')
                                        textArea.value = command
                                        document.body.appendChild(textArea)
                                        textArea.select()
                                        document.execCommand('copy')
                                        document.body.removeChild(textArea)
                                      }
                                      setCopied(true)
                                      setTimeout(() => setCopied(false), 2000)
                                      toast({
                                        title: 'Copied!',
                                        description: 'Mac/Linux command copied to clipboard.',
                                        variant: 'default',
                                      })
                                    } catch (error) {
                                      console.error('Failed to copy:', error)
                                      toast({
                                        title: 'Copy Failed',
                                        description: 'Please copy the command manually.',
                                        variant: 'destructive',
                                      })
                                    }
                                  }}
                                >
                                  {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                  Copy (Mac/Linux)
                                </Button>
                              </div>
                            </div>
                          </li>
                          <li>
                            <strong>Wait 5 seconds → Tailscale icon turns GREEN</strong>
                          </li>
                          <li>
                            <strong>Open browser → </strong>
                            <a href="http://100.70.24.37:8888" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">http://100.70.24.37:8888</a>
                            <br />
                            → crAPI login page loads
                          </li>
                        </ol>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                        <p className="text-green-900 font-medium">
                          ✅ <strong>Done! You're in the lab.</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-lg p-3 mt-4 border ${
                    timeRemaining > 60 
                      ? 'bg-green-50 border-green-200' 
                      : timeRemaining > 30 
                        ? 'bg-yellow-50 border-yellow-200' 
                        : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-center space-x-2">
                      <Clock className={`w-5 h-5 ${
                        timeRemaining > 60 
                          ? 'text-green-600' 
                          : timeRemaining > 30 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                      }`} />
                      <span className={`text-lg font-semibold ${
                        timeRemaining > 60 
                          ? 'text-green-900' 
                          : timeRemaining > 30 
                            ? 'text-yellow-900' 
                            : 'text-red-900'
                      }`}>
                        Time Remaining: {formatTimeRemaining(timeRemaining)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateVpnKey}
                    disabled={isGenerating || (vpnKey && timeRemaining > 0)}
                    className="flex-1"
                    title={vpnKey && timeRemaining > 0 ? "One-time key already active. Wait for expiry to generate new." : undefined}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Generate New
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchVpnKey}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>

                {/* Important: Lab Access Instructions */}
                <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                  <div className="flex items-start space-x-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Connect to Tailscale First!</h3>
                      <p className="text-sm text-yellow-800 mb-2">
                        <strong>You must connect to Tailscale VPN using the key above before accessing the lab.</strong>
                      </p>
                      <p className="text-sm text-yellow-700">
                        The lab URL will only work after you've successfully connected to Tailscale. Once connected, refresh this page to verify your connection.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lab Access Button - Only works if Tailscale connected */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Info className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-blue-800">After Connecting to Tailscale</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-4">
                    Once you've connected to Tailscale using the key above, refresh this page. The lab will become accessible automatically.
                  </p>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => {
                      // Refresh to check if key was used (Tailscale connected)
                      fetchVpnKey()
                      toast({
                        title: 'Checking Connection',
                        description: 'Verifying Tailscale connection status...',
                      })
                    }}
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Check Tailscale Connection
                  </Button>
                  <p className="text-xs text-blue-600 mt-2 text-center">
                    Lab URL: {process.env.NEXT_PUBLIC_CRAPI_URL || 'http://100.70.24.37:8888'}
                  </p>
                </div>
              </>
            </div>
          )}
      </CardContent>
    </Card>
  )
}
