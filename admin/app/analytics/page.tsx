'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfitabilityByCategory } from '@/components/profitability-by-category';
import { PricingAccuracy } from '@/components/pricing-accuracy';
import { UserCohorts } from '@/components/user-cohorts';
import { FunnelAnalysis } from '@/components/funnel-analysis';
import { JakeEngagement } from '@/components/jake-engagement';
import { EscalationAnalysis } from '@/components/escalation-analysis';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-muted-foreground">
          Deep insights into profitability, pricing, user behavior, and Jake engagement
        </p>
      </div>

      <Tabs defaultValue="profitability" className="w-full">
        <TabsList>
          <TabsTrigger value="profitability">Profitability</TabsTrigger>
          <TabsTrigger value="accuracy">Pricing Accuracy</TabsTrigger>
          <TabsTrigger value="cohorts">User Cohorts</TabsTrigger>
          <TabsTrigger value="funnel">Funnel Analysis</TabsTrigger>
          <TabsTrigger value="jake">Jake Engagement</TabsTrigger>
          <TabsTrigger value="escalations">Escalations</TabsTrigger>
        </TabsList>

        <TabsContent value="profitability" className="mt-6">
          <ProfitabilityByCategory />
        </TabsContent>

        <TabsContent value="accuracy" className="mt-6">
          <PricingAccuracy />
        </TabsContent>

        <TabsContent value="cohorts" className="mt-6">
          <UserCohorts />
        </TabsContent>

        <TabsContent value="funnel" className="mt-6">
          <FunnelAnalysis />
        </TabsContent>

        <TabsContent value="jake" className="mt-6">
          <JakeEngagement />
        </TabsContent>

        <TabsContent value="escalations" className="mt-6">
          <EscalationAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
