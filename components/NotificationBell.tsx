'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api';

interface Notification {
  id: string;
  type: 'vm_credentials';
  title: string;
  message: string;
  labName: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  userId: string;
  onNotificationClick?: () => void;
}

export default function NotificationBell({ userId, onNotificationClick }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false); // Start with false to prevent initial loading state

  // Fetch notifications
  const fetchNotifications = async () => {
    // Don't make API calls if userId is invalid or empty
    if (!userId || userId.trim() === '') {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.getUserNotifications(userId);
      if (response.success) {
        setNotifications(response.data || []);
      } else {
        // If API call fails, just set empty notifications instead of showing error
        setNotifications([]);
      }
    } catch (error) {
      // Silently handle errors - don't show console errors for notifications
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      // Add a small delay to prevent rapid API calls
      const timer = setTimeout(() => {
        fetchNotifications();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Don't render if no valid userId
  if (!userId || userId.trim() === '') {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem 
              key={notification.id} 
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => {
                if (onNotificationClick) {
                  onNotificationClick();
                }
              }}
            >
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${notification.isRead ? 'bg-gray-300' : 'bg-blue-500'}`} />
                  <span className="font-medium text-sm">{notification.title}</span>
                </div>
                <p className="text-xs text-gray-600">{notification.message}</p>
                <p className="text-xs text-gray-400">{notification.labName}</p>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
