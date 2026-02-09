'use client';

import { useEffect, useState } from 'react';
import { MetricCard } from '@/components/metric-card';
import { LiveFeed } from '@/components/live-feed';
import { QuickActions } from '@/components/quick-actions';
import { DashboardCharts } from '@/components/charts/dashboard-charts';
import { fetchDashboardMetrics } from '@/lib/admin-api';
import type { DashboardMetrics } from '@/types/dashboard';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await fetchDashboardMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Failed to load dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();

    // Auto-refresh every 5 seconds
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-destructive">Failed to load metrics</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
        <p className="text-muted-foreground">
          Real-time operations dashboard for JakeBuysIt
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Today's Offers"
          value={metrics.todayOffers.count}
          trend={metrics.todayOffers.trend}
          icon="package"
        />
        <MetricCard
          title="Acceptance Rate"
          value={`${metrics.acceptanceRate.today}%`}
          subtitle={`7d: ${metrics.acceptanceRate.week}% | 30d: ${metrics.acceptanceRate.month}%`}
          icon="percent"
        />
        <MetricCard
          title="Items In Transit"
          value={metrics.itemsInTransit}
          icon="truck"
        />
        <MetricCard
          title="Payouts Pending"
          value={`$${metrics.payoutsPending.amount.toLocaleString()}`}
          subtitle={`${metrics.payoutsPending.count} users`}
          icon="dollar-sign"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live Feed (2 columns) */}
        <div className="lg:col-span-2">
          <LiveFeed />
        </div>

        {/* Quick Actions (1 column) */}
        <div>
          <QuickActions
            escalations={metrics.escalationsCount}
            fraudAlerts={metrics.fraudAlertsCount}
            payoutIssues={metrics.payoutIssuesCount}
          />
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts />
    </div>
  );
}
