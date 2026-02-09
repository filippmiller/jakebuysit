import { ArrowUp, ArrowDown, Package, Percent, Truck, DollarSign, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon?: 'package' | 'percent' | 'truck' | 'dollar-sign';
  className?: string;
}

const iconMap: Record<string, LucideIcon> = {
  package: Package,
  percent: Percent,
  truck: Truck,
  'dollar-sign': DollarSign,
};

export function MetricCard({ title, value, subtitle, trend, icon, className }: MetricCardProps) {
  const Icon = icon ? iconMap[icon] : null;

  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>

      <div className="mt-2">
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      {trend !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          {trend > 0 ? (
            <ArrowUp className="h-3 w-3 text-green-600" />
          ) : (
            <ArrowDown className="h-3 w-3 text-red-600" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              trend > 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {Math.abs(trend)}% vs yesterday
          </span>
        </div>
      )}
    </div>
  );
}
