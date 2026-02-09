import Link from 'next/link';
import { AlertTriangle, Shield, DollarSign, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  escalations: number;
  fraudAlerts: number;
  payoutIssues: number;
}

const actions = [
  {
    href: '/escalations',
    label: 'Escalations Queue',
    icon: AlertTriangle,
    countKey: 'escalations' as const,
    color: 'text-yellow-600 bg-yellow-50',
  },
  {
    href: '/fraud',
    label: 'Fraud Alerts',
    icon: Shield,
    countKey: 'fraudAlerts' as const,
    color: 'text-red-600 bg-red-50',
  },
  {
    href: '/finance',
    label: 'Payout Issues',
    icon: DollarSign,
    countKey: 'payoutIssues' as const,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    href: '/health',
    label: 'System Health',
    icon: Activity,
    countKey: null,
    color: 'text-green-600 bg-green-50',
  },
];

export function QuickActions({ escalations, fraudAlerts, payoutIssues }: QuickActionsProps) {
  const counts = { escalations, fraudAlerts, payoutIssues };

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
      </div>

      <ul className="divide-y">
        {actions.map((action) => {
          const Icon = action.icon;
          const count = action.countKey ? counts[action.countKey] : null;

          return (
            <li key={action.href}>
              <Link
                href={action.href}
                className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('rounded-lg p-2', action.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{action.label}</span>
                </div>
                {count !== null && count > 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
