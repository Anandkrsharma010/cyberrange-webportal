'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ShoppingCart, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  XCircle, 
  RefreshCw,
  ExternalLink,
  Copy
} from 'lucide-react';
import { formatDateIST } from '@/lib/dateUtils';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    _id: string;
    name: string;
    email: string;
    labsBought: number;
    totalPurchases: number;
    totalAmount: number;
    completedPurchases: number;
    pendingPurchases: number;
    allPurchases: Array<{
      _id: string;
      labId: string;
      labTitle: string;
      amount: number;
      status: string;
      razorpayPaymentId: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
}

export default function PurchaseDetailsModal({
  isOpen,
  onClose,
  user
}: PurchaseDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the allPurchases data directly from the user object
  const purchases = user.allPurchases || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'captured': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
      case 'created': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'refunded': return <XCircle className="h-4 w-4 text-blue-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'captured': return 'bg-green-100 text-green-800';
      case 'pending':
      case 'created': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
      case 'captured': return 'Payment Completed';
      case 'completed': return 'Payment Completed';
      case 'pending':
      case 'created': return 'Payment Pending';
      case 'failed': return 'Payment Failed';
      case 'refunded': return 'Payment Refunded';
      default: return status;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Purchase Details - {user.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Complete purchase history and payment information for {user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 p-1">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Card className="p-4 text-center bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-shadow">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-blue-700">{user.totalPurchases}</div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Purchases</p>
              </div>
            </Card>
            <Card className="p-4 text-center bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-md transition-shadow">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-700">{user.completedPurchases}</div>
                <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Completed</p>
              </div>
            </Card>
            <Card className="p-4 text-center bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-md transition-shadow">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-yellow-700">{user.pendingPurchases}</div>
                <p className="text-xs font-medium text-yellow-600 uppercase tracking-wide">Pending</p>
              </div>
            </Card>
            <Card className="p-4 text-center bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-shadow">
              <div className="space-y-2">
                <div className="text-2xl font-bold text-purple-700">₹{user.totalAmount.toLocaleString()}</div>
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Total Amount</p>
              </div>
            </Card>
          </div>

          {/* Purchase Details Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Purchase History</CardTitle>
              <CardDescription className="text-sm text-gray-600">Detailed purchase records with payment information</CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg text-gray-600">No purchases found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Lab</TableHead>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Payment ID</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map((purchase) => (
                        <TableRow key={purchase._id} className="hover:bg-gray-50">
                          <TableCell className="py-4">
                            <div>
                              <div className="font-medium text-sm">{purchase.labTitle}</div>
                              <div className="text-xs text-gray-500 mt-1">ID: {purchase.labId ? String(purchase.labId).substring(0, 8) : 'N/A'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-sm">₹{purchase.amount.toLocaleString()}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge className={`${getStatusColor(purchase.status)} text-xs px-2 py-1`}>
                              {getStatusLabel(purchase.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                {purchase.razorpayPaymentId.substring(0, 16)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(purchase.razorpayPaymentId)}
                                className="h-6 w-6 p-0 hover:bg-gray-100"
                                title="Copy full ID"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{formatDateIST(purchase.createdAt)}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex-shrink-0 flex justify-end pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="px-6">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
