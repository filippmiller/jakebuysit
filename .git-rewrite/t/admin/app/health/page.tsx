'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceStatus } from '@/components/service-status';
import { QueueMonitoring } from '@/components/queue-monitoring';
import { ErrorTracking } from '@/components/error-tracking';
import { ApiMetrics } from '@/components/api-metrics';
import { DatabasePerformance } from '@/components/database-performance';

export default function HealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
        <p className="text-muted-foreground">
          Monitor services, queues, errors, and performance metrics
        </p>
      </div>

      <Tabs defaultValue="services" className="w-full">
        <TabsList>
          <TabsTrigger value="services">Service Status</TabsTrigger>
          <TabsTrigger value="queue">Queue Monitoring</TabsTrigger>
          <TabsTrigger value="errors">Error Tracking</TabsTrigger>
          <TabsTrigger value="api">API Metrics</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-6">
          <ServiceStatus />
        </TabsContent>

        <TabsContent value="queue" className="mt-6">
          <QueueMonitoring />
        </TabsContent>

        <TabsContent value="errors" className="mt-6">
          <ErrorTracking />
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <ApiMetrics />
        </TabsContent>

        <TabsContent value="database" className="mt-6">
          <DatabasePerformance />
        </TabsContent>
      </Tabs>
    </div>
  );
}
