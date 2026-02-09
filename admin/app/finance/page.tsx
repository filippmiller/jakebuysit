'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PayoutQueue } from '@/components/payout-queue';
import { CashFlowDashboard } from '@/components/cash-flow-dashboard';
import { FinancialMetrics } from '@/components/financial-metrics';

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payouts & Finance</h1>
        <p className="text-muted-foreground">
          Manage payouts, monitor cash flow, and track financial metrics
        </p>
      </div>

      <Tabs defaultValue="queue" className="w-full">
        <TabsList>
          <TabsTrigger value="queue">Payout Queue</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="metrics">Financial Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-6">
          <PayoutQueue />
        </TabsContent>

        <TabsContent value="cashflow" className="mt-6">
          <CashFlowDashboard />
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <FinancialMetrics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
