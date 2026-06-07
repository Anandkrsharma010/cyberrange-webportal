'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Server, User, Key } from 'lucide-react';
import { apiClient } from '@/lib/api';
import logger from '@/lib/logger';
import { toast } from 'sonner';

interface Credential {
  labId: string;
  labName: string;
  ipAddress: string;
  username: string;
  key: string;
  credentialsSent: boolean;
  credentialsSentAt: string;
}

interface UserCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function UserCredentialsModal({ isOpen, onClose, userId }: UserCredentialsModalProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getUserCredentials(userId);
      if (response.success) {
        setCredentials(response.data || []);
      }
    } catch (error) {
      logger.error('Error fetching credentials:', error);
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchCredentials();
    }
  }, [isOpen, userId]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const availableCredentials = credentials.filter(c => c.credentialsSent);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            VM Access Credentials
          </DialogTitle>
          <DialogDescription>
            Your lab access credentials are ready for use
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading credentials...</p>
            </div>
          ) : availableCredentials.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Credentials Available</h3>
              <p className="text-sm text-gray-500">
                Your lab credentials will appear here once they are sent by the administrator.
              </p>
            </div>
          ) : (
            availableCredentials.map((credential) => (
              <Card key={credential.labId} className="border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {credential.labName}
                    </CardTitle>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Credentials Ready
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* IP Address */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Server className="h-4 w-4" />
                      VM IP Address
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={credential.ipAddress}
                        readOnly
                        className="bg-gray-50"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(credential.ipAddress, 'IP Address')}
                      >
                        {copiedField === 'IP Address' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <User className="h-4 w-4" />
                      VM Username
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={credential.username}
                        readOnly
                        className="bg-gray-50"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(credential.username, 'Username')}
                      >
                        {copiedField === 'Username' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Key/Password */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Key className="h-4 w-4" />
                      VM Key/Access Token
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={credential.key}
                        readOnly
                        type="password"
                        className="bg-gray-50"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(credential.key, 'Key')}
                      >
                        {copiedField === 'Key' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Credentials sent on: {new Date(credential.credentialsSentAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
