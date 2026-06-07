'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  FileText,
  Users,
  LogOut,
  Menu,
  Shield,
  Activity
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSidebar } from '@/contexts/SidebarContext';

const navigation = [
  {
    section: 'Overview',
    items: [
      {
        name: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard
      }
    ]
  },
  {
    section: 'Management',
    items: [
      {
        name: 'Labs',
        href: '/admin/labs',
        icon: BookOpen
      },
      {
        name: 'Quizzes',
        href: '/admin/quizzes',
        icon: HelpCircle
      },
      {
        name: 'Content',
        href: '/admin/content',
        icon: FileText
      },
      {
        name: 'Accounts',
        href: '/admin/users',
        icon: Users
      }
    ]
  }
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isCollapsed, toggleCollapse } = useSidebar();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        style={{
          width: '44px',
          height: '44px',
          background: 'var(--cyber-card-bg)',
          border: '1px solid var(--cyber-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)'
        }}
      >
        <Menu size={20} color="var(--cyber-text-primary)" />
      </button>

      {/* Sidebar */}
      <div 
        className={`cyber-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo" onClick={toggleCollapse}>
            <div className="logo-icon">
              <Shield size={24} />
            </div>
            <div className="logo-text">
              <div className="text-white">RangeOps</div>
              <div className="mt-0.5 text-[10px] leading-tight text-[var(--cyber-text-secondary)]">
                by DeepTrustxAI Academy
              </div>
              <div className="logo-subtitle">Admin Portal</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigation.map((section, idx) => (
            <div key={idx} className="nav-section">
              <div className="nav-section-title">{section.section}</div>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon className="nav-icon" />
                    <span className="nav-label">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'Admin User'}</div>
              <div className="user-role">Administrator</div>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="nav-link"
            style={{ width: '100%' }}
            title={isCollapsed ? 'Sign out' : undefined}
          >
            <LogOut className="nav-icon" />
            <span className="nav-label">Sign out</span>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
