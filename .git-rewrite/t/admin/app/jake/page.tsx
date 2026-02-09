'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { JakeClipsManager } from '@/components/jake-clips-manager';
import { JakeTemplatesManager } from '@/components/jake-templates-manager';
import { JakeDynamicScripts } from '@/components/jake-dynamic-scripts';
import { JakeVoiceSettings } from '@/components/jake-voice-settings';
import { JakeEngagementAnalytics } from '@/components/jake-engagement-analytics';

export default function JakePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Jake Voice Management</h1>
        <p className="text-muted-foreground">
          Manage Jake's voice clips, templates, and engagement analytics
        </p>
      </div>

      <Tabs defaultValue="clips" className="w-full">
        <TabsList>
          <TabsTrigger value="clips">Pre-Recorded Clips</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="dynamic">Dynamic Scripts</TabsTrigger>
          <TabsTrigger value="settings">Voice Settings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="clips" className="mt-6">
          <JakeClipsManager />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <JakeTemplatesManager />
        </TabsContent>

        <TabsContent value="dynamic" className="mt-6">
          <JakeDynamicScripts />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <JakeVoiceSettings />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <JakeEngagementAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
