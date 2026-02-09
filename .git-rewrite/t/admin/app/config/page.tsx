'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfigEditor } from '@/components/config-editor';

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuration Panel</h1>
        <p className="text-muted-foreground">
          Manage business rules, pricing logic, and system thresholds
        </p>
      </div>

      <Tabs defaultValue="pricing" className="w-full">
        <TabsList>
          <TabsTrigger value="pricing">Pricing Rules</TabsTrigger>
          <TabsTrigger value="confidence">Confidence Thresholds</TabsTrigger>
          <TabsTrigger value="adjustments">Dynamic Adjustments</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="mt-6">
          <ConfigEditor type="pricing" />
        </TabsContent>

        <TabsContent value="confidence" className="mt-6">
          <ConfigEditor type="confidence" />
        </TabsContent>

        <TabsContent value="adjustments" className="mt-6">
          <ConfigEditor type="adjustments" />
        </TabsContent>

        <TabsContent value="fraud" className="mt-6">
          <ConfigEditor type="fraud" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
