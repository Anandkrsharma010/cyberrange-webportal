'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Key, Server, User, AlertCircle, BookOpen } from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import logger from '@/lib/logger';

interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    user: {
      _id: string;
      name: string;
      email: string;
      role: 'user' | 'admin';
      emailVerified: boolean;
      joinedDate: string;
      lastLogin: string;
    };
    labRecords: Array<{
      labName: string;
      purchaseId: string;
      boughtDate: string;
      expires: string;
      status: 'Active' | 'Pending' | 'Expired';
      payment: string;
    }>;
  } | null;
}

export default function CredentialsModal({
  isOpen,
  onClose,
  user
}: CredentialsModalProps) {
  const [credentials, setCredentials] = useState({
    ipAddress: '',
    username: '',
    key: ''
  });
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [purchasedLabs, setPurchasedLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingLabs, setLoadingLabs] = useState(false);

  // Fetch user's purchased labs when modal opens
  useEffect(() => {
    if (isOpen && user && user.user._id) {
      fetchPurchasedLabs();
    }
  }, [isOpen, user?.user._id]);

  const fetchPurchasedLabs = async (forceRefresh = false) => {
    // Prevent multiple simultaneous calls
    if (loadingLabs && !forceRefresh) {
      logger.log('⏳ Already loading labs, skipping duplicate call');
      return;
    }
    
    try {
      setLoadingLabs(true);
      setError(null);
  logger.log('🔍 Fetching purchased labs for user:', user?.user?._id, forceRefresh ? '(forced refresh)' : '');
      
      // Validate user ID before making request
      if (!user?.user?._id) {
        throw new Error('User ID is required');
      }
      
      const response = await adminApi.getUserPurchasedLabs(user.user._id);
      logger.log('🔍 Response from getUserPurchasedLabs:', {
        success: response.success,
        message: response.message,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        purchasedLabs: response.data?.purchasedLabs?.length || 0,
        fullResponse: response
      });
      
      // Enhanced response validation
      if (response.success && response.data) {
        const purchasedLabs = response.data.purchasedLabs;
        
        if (Array.isArray(purchasedLabs)) {
          // Validate each lab object and extract lab details
          const validLabs = purchasedLabs.filter((lab: any) => {
            const labIdValue = lab.labId?._id || lab.labId;
            const labTitle = lab.labId?.title || lab.labTitle;
            const isValid = lab && labIdValue && labTitle;
            if (!isValid) {
              logger.warn('⚠️ Invalid lab object found:', lab);
            }
            return isValid;
          });
          
          logger.log(`✅ Loaded ${validLabs.length} valid labs out of ${purchasedLabs.length} total`);
          setPurchasedLabs(validLabs);
          
          // Auto-select first unsent lab if available (only on initial load)
          if (!forceRefresh) {
            const unsentLabs = validLabs.filter((lab: any) => !lab.credentialsSent);
            if (unsentLabs.length > 0) {
              const firstLabId = unsentLabs[0].labId?._id || unsentLabs[0].labId;
              setSelectedLabId(firstLabId);
            }
          }
          
          logger.log('✅ Successfully loaded labs:', validLabs.length);
        } else {
          logger.warn('⚠️ purchasedLabs is not an array:', purchasedLabs);
          setPurchasedLabs([]);
        }
      } else {
        logger.error('❌ API response not successful:', {
          success: response.success,
          message: response.message,
          error: response.error,
          data: response.data
        });
        
        // More specific error messages
        if (response.message) {
          setError(`Failed to load user labs: ${response.message}`);
        } else if (response.error) {
          setError(`Failed to load user labs: ${response.error}`);
        } else {
          setError('Failed to load user labs: Unknown error');
        }
      }
    } catch (err) {
      logger.error('❌ Failed to fetch purchased labs:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        user: user?.user?._id,
        timestamp: new Date().toISOString()
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(`Failed to load user labs: ${errorMessage}`);
    } finally {
      setLoadingLabs(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.ipAddress || !credentials.username || !credentials.key || !selectedLabId || !user) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);

      try {
      logger.log('🚀 Submitting credentials for lab:', selectedLabId);
      const response = await adminApi.sendVMCredentials(user.user._id, selectedLabId, {
        ipAddress: credentials.ipAddress,
        username: credentials.username,
        key: credentials.key
      });
      
        if (response.success) {
        logger.log('✅ Credentials sent successfully');
        // Show success message
        alert('VM credentials sent successfully!');
      } else {
        throw new Error(response.message || 'Failed to send credentials');
      }
      
      // Clear form
      setCredentials({ ipAddress: '', username: '', key: '' });
      setSelectedLabId('');
      
  // Refresh the purchased labs data to show updated status
  logger.log('🔄 Refreshing purchased labs after successful send');
  await fetchPurchasedLabs(true); // Force refresh to get latest data
      
      onClose();
    } catch (err) {
      logger.error('❌ Failed to send credentials:', err);
      setError('Failed to send credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCredentials({ ipAddress: '', username: '', key: '' });
    setError(null);
    onClose();
  };

  // Early return if user is null
  if (!user) {
    return null;
  }

  const canSendCredentials = user.labRecords && user.labRecords.length > 0 && 
                            (user.labRecords[0].payment === 'paid' || 
                             user.labRecords[0].payment === 'completed' || 
                             user.labRecords[0].payment === 'captured');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-card-foreground">
            <div className="h-10 w-10 rounded-full action-icon flex items-center justify-center">
              <Key className="h-5 w-5" color="var(--cyber-blue-primary)" />
            </div>
            Send VM Credentials
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Send VM access credentials to <span className="font-medium text-card-foreground">{user.user.name}</span> ({user.user.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info Card */}
          <Card className="border-border">
            <CardHeader className="pb-2 bg-card">
              <CardTitle className="text-lg font-semibold text-card-foreground">User Information</CardTitle>
              <CardDescription className="text-muted-foreground">Purchase details and payment status</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 min-w-[80px]">User:</span>
                    <span className="text-sm font-semibold text-gray-900 break-words">{user.user.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 min-w-[80px]">Email:</span>
                    <span className="text-sm text-gray-900 break-words">{user.user.email}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 min-w-[80px]">Latest Lab:</span>
                    <span className="text-sm font-semibold text-gray-900 break-words">
                      {user.labRecords && user.labRecords.length > 0 ? user.labRecords[0].labName : 'No purchases'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 min-w-[80px]">Payment Status:</span>
                    <Badge 
                      variant={canSendCredentials ? 'default' : 'secondary'}
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        canSendCredentials 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}
                    >
                      {user.labRecords && user.labRecords.length > 0 ? 
                        (user.labRecords[0].payment === 'paid' ? 'Payment Completed' : user.labRecords[0].payment) : 
                        'No purchases'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning if payment not completed */}
          {!canSendCredentials && (
                  <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
              <AlertCircle className="h-5 w-5" color="var(--cyber-orange)" />
              <div>
                <p className="text-sm font-medium text-card-foreground">Payment Required</p>
                <p className="text-sm text-muted-foreground">
                  Cannot send credentials. Payment status must be "completed", "paid", or "captured".
                </p>
              </div>
            </div>
          )}

          {/* Lab Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Lab</h3>
            {loadingLabs ? (
              <div className="flex items-center justify-center py-6">
                <div className="cyber-spinner"></div>
                <span className="ml-3 text-sm text-muted-foreground">Loading labs...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <Label htmlFor="labSelect" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <BookOpen className="h-4 w-4" color="var(--cyber-text-muted)" />
                  Choose Lab for Credentials
                </Label>
                <Select value={selectedLabId} onValueChange={setSelectedLabId}>
                  <SelectTrigger className="w-full border-border focus-visible:border-ring focus-visible:ring-ring/50">
                    <SelectValue placeholder="Select a lab..." />
                  </SelectTrigger>
                  <SelectContent>
                    {purchasedLabs.map((lab: any) => {
                      // Handle both formats: labId as string or object
                      const labIdValue = lab.labId?._id || lab.labId;
                      const labTitle = lab.labId?.title || lab.labTitle || 'Unknown Lab';
                      
                      return (
                        <SelectItem 
                          key={labIdValue} 
                          value={labIdValue}
                          disabled={lab.credentialsSent}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={lab.credentialsSent ? 'text-muted-foreground' : 'text-card-foreground'}>
                              {labTitle}
                            </span>
                            <div className="flex items-center gap-2">
                              {lab.credentialsSent ? (
                                <Badge variant="secondary" className="text-xs">
                                  ✓ Sent
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {purchasedLabs.length === 0 && !loadingLabs && !error && (
                  <p className="text-sm text-muted-foreground">No purchased labs found for this user.</p>
                )}
                {purchasedLabs.length > 0 && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-700">
                        {purchasedLabs.filter((lab: any) => lab.credentialsSent).length} Sent
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-yellow-700">
                        {purchasedLabs.filter((lab: any) => !lab.credentialsSent).length} Pending
                      </span>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="flex items-center justify-between gap-2 p-3 bg-card border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" color="var(--cyber-red)" />
                      <p className="text-sm text-card-foreground">{error}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fetchPurchasedLabs(true)}
                      disabled={loadingLabs}
                      className="px-3"
                    >
                      {loadingLabs ? 'Retrying...' : 'Retry'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VM Access Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">VM Access Details</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="ipAddress" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Server className="h-4 w-4" color="var(--cyber-text-muted)" />
                      VM IP Address
                    </Label>
                  <Input
                    id="ipAddress"
                    type="text"
                    placeholder="192.168.1.100"
                    value={credentials.ipAddress}
                    onChange={(e) => setCredentials(prev => ({ ...prev, ipAddress: e.target.value }))}
                    disabled={!canSendCredentials}
                    required
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="username" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <User className="h-4 w-4" color="var(--cyber-text-muted)" />
                    VM Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="student"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    disabled={!canSendCredentials}
                    required
                    className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="key" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Key className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  VM Key/Access Token
                </Label>
                  <Textarea
                  id="key"
                  placeholder="Enter the VM access key or SSH key..."
                  value={credentials.key}
                  onChange={(e) => setCredentials(prev => ({ ...prev, key: e.target.value }))}
                  disabled={!canSendCredentials}
                  required
                  rows={4}
                    className="w-full resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
                  <AlertCircle className="h-5 w-5" color="var(--cyber-red)" />
                  <p className="text-sm text-card-foreground">{error}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !canSendCredentials || !selectedLabId || 
                           (selectedLabId && purchasedLabs.find((lab: any) => (lab.labId?._id || lab.labId) === selectedLabId)?.credentialsSent)}
                  className="w-full sm:w-auto px-6 py-2"
                >
                  {loading ? 'Sending...' : 
                   (selectedLabId && purchasedLabs.find((lab: any) => (lab.labId?._id || lab.labId) === selectedLabId)?.credentialsSent) ? 'Already Sent' :
                   purchasedLabs.filter((lab: any) => !lab.credentialsSent).length === 0 ? 'All Labs Sent' :
                   'Send Credentials'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
