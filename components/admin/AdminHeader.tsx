'use client';

import { useAuth } from '@/lib/auth';
import { Bell } from 'lucide-react';
import { useSidebar } from '@/contexts/SidebarContext';

export default function AdminHeader() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();

  return (
    <header className="site-header transition-all p-2 duration-300">
      <div
        className="header-container"
        style={{ marginLeft: isCollapsed ? '64px' : '256px' }}
      >
        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 text-muted-foreground hover:text-cyber-blue-secondary hover:bg-[rgba(0,212,255,0.03)] rounded-lg transition-colors">
            <Bell className="h-5 w-5" />
          </button>

          {/* User info */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-card-foreground">
                {user?.name || 'Admin User'}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.role || 'admin'}
              </p>
            </div>
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--cyber-blue-primary), var(--cyber-purple))' }}
            >
              <span className="text-white font-medium text-sm">
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
