'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AuthService } from '@/lib/auth';
import { AdminUser } from '@/types/auth';
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  Settings,
  Mic,
  Warehouse,
  DollarSign,
  Users,
  Shield,
  BarChart,
  Activity,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/offers', label: 'Offers', icon: Package },
  { href: '/escalations', label: 'Escalations', icon: AlertTriangle },
  { href: '/config', label: 'Configuration', icon: Settings },
  { href: '/jake', label: 'Jake Voice', icon: Mic },
  { href: '/warehouse', label: 'Warehouse', icon: Warehouse },
  { href: '/finance', label: 'Finance', icon: DollarSign },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/fraud', label: 'Fraud', icon: Shield },
  { href: '/analytics', label: 'Analytics', icon: BarChart },
  { href: '/health', label: 'System Health', icon: Activity },
];

export function AdminNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    setUser(AuthService.getUser());
  }, []);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await AuthService.logout();
    }
  };

  return (
    <nav className="w-64 border-r bg-white p-6">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-primary">Jake Admin</h1>
        <p className="text-xs text-muted-foreground">Mission Control</p>
      </div>

      <ul className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname?.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 rounded-md border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground">Logged in as</p>
        <p className="text-sm font-medium">{user?.name || 'Admin User'}</p>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
        <button
          onClick={handleLogout}
          className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <LogOut className="h-3 w-3" />
          Logout
        </button>
      </div>
    </nav>
  );
}
