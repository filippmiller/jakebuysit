'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IncomingShipments } from '@/components/incoming-shipments';
import { VerificationInterface } from '@/components/verification-interface';
import { VerifiedInventory } from '@/components/verified-inventory';

export default function WarehousePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Warehouse Operations</h1>
        <p className="text-muted-foreground">
          Manage incoming shipments, verify items, and track inventory
        </p>
      </div>

      <Tabs defaultValue="incoming" className="w-full">
        <TabsList>
          <TabsTrigger value="incoming">Incoming Shipments</TabsTrigger>
          <TabsTrigger value="verify">Verification</TabsTrigger>
          <TabsTrigger value="inventory">Verified Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-6">
          <IncomingShipments />
        </TabsContent>

        <TabsContent value="verify" className="mt-6">
          <VerificationInterface />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <VerifiedInventory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
