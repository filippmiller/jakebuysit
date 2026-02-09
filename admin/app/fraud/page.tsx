'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FraudAlerts } from '@/components/fraud-alerts';
import { FraudChecksByType } from '@/components/fraud-checks-by-type';
import { UserRiskDashboard } from '@/components/user-risk-dashboard';
import { FraudRulesEditor } from '@/components/fraud-rules-editor';

export default function FraudPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fraud Detection</h1>
        <p className="text-muted-foreground">
          Monitor fraud alerts, manage rules, and review high-risk users
        </p>
      </div>

      <Tabs defaultValue="alerts" className="w-full">
        <TabsList>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
          <TabsTrigger value="checks">Check Types</TabsTrigger>
          <TabsTrigger value="users">User Risk</TabsTrigger>
          <TabsTrigger value="rules">Fraud Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-6">
          <FraudAlerts />
        </TabsContent>

        <TabsContent value="checks" className="mt-6">
          <FraudChecksByType />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserRiskDashboard />
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <FraudRulesEditor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
