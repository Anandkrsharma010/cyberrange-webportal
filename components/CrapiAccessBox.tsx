'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface CrapiAccessBoxProps {
  labId: string
  className?: string
}

export default function CrapiAccessBox({ labId, className = '' }: CrapiAccessBoxProps) {
  // Only show for CRAPI lab
  if (labId !== 'crapi') {
    return null
  }

  const crapiUrl = process.env.NEXT_PUBLIC_CRAPI_URL || 'http://100.70.24.37:8888'

  const handleAccess = () => {
    window.open(crapiUrl, '_blank')
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span>CRAPI Lab Access</span>
        </CardTitle>
        <CardDescription>
          Access your CRAPI lab environment via Tailscale
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3 mb-3">
            <Info className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-2">Ready to Access Lab</h3>
              <p className="text-sm text-green-700 mb-3">
                Make sure you're connected to Tailscale VPN first, then click below to access your CRAPI lab environment.
              </p>
              <div className="bg-white rounded-lg p-3 mb-3">
                <p className="text-xs text-gray-600 mb-1">Lab URL:</p>
                <p className="text-sm font-mono text-blue-600">{crapiUrl}</p>
              </div>
              <Button
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                onClick={handleAccess}
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Open CRAPI Lab
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800 font-medium mb-2">📋 Quick Setup Instructions:</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Download and install Tailscale from <a href="https://tailscale.com/download" target="_blank" rel="noopener noreferrer" className="underline">tailscale.com/download</a></li>
            <li>Open Tailscale app and connect with your account</li>
            <li>Wait for Tailscale to show "Connected" status</li>
            <li>Click "Open CRAPI Lab" button above</li>
          </ol>
        </div>

        <div className="flex items-center justify-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            No VPN Keys Required
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Tailscale Direct Access
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}



