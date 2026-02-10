'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api-client';
import { CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

interface EbayStatus {
  connected: boolean;
  ebayUsername?: string;
  autoCrosspost?: boolean;
  lastSyncAt?: string;
}

export default function IntegrationsPage() {
  const [ebayStatus, setEbayStatus] = useState<EbayStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check URL params for callback status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ebayParam = params.get('ebay');

    if (ebayParam === 'connected') {
      setAlert({ type: 'success', message: 'eBay account connected successfully!' });
      // Clean up URL
      window.history.replaceState({}, '', '/settings/integrations');
    } else if (ebayParam === 'error') {
      setAlert({ type: 'error', message: 'Failed to connect eBay account. Please try again.' });
      window.history.replaceState({}, '', '/settings/integrations');
    }

    fetchEbayStatus();
  }, []);

  const fetchEbayStatus = async () => {
    try {
      const status = await apiClient.get<EbayStatus>('/integrations/ebay/status');
      setEbayStatus(status);
    } catch (err: any) {
      console.error('Failed to fetch eBay status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectEbay = async () => {
    setActionLoading(true);
    try {
      const { authUrl } = await apiClient.get<{ authUrl: string }>('/integrations/ebay/authorize');
      // Redirect to eBay authorization
      window.location.href = authUrl;
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to initiate eBay authorization' });
      setActionLoading(false);
    }
  };

  const handleDisconnectEbay = async () => {
    if (!confirm('Are you sure you want to disconnect your eBay account?')) {
      return;
    }

    setActionLoading(true);
    try {
      await apiClient.post('/integrations/ebay/disconnect', {});
      setEbayStatus({ connected: false });
      setAlert({ type: 'success', message: 'eBay account disconnected successfully' });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to disconnect eBay account' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAutoCrosspost = async (enabled: boolean) => {
    try {
      await apiClient.post('/integrations/ebay/auto-crosspost', { enabled });
      setEbayStatus((prev) => ({ ...prev, autoCrosspost: enabled }));
      setAlert({
        type: 'success',
        message: enabled
          ? 'Auto-crosspost enabled. Accepted offers will be automatically listed on eBay.'
          : 'Auto-crosspost disabled. You can manually crosspost offers from the offer page.',
      });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update auto-crosspost setting' });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Connect your accounts to expand your selling reach
          </p>
        </div>

        {alert && (
          <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
            {alert.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="#0064D2">
                    <path d="M7.29 3.77l-.782 4.675h4.78L11.95 3.77H7.29zm5.54 0l-.66 4.675h5.185l.78-4.675h-5.305zM6.51 9.63l-.782 4.675h4.78L11.17 9.63H6.51zm5.54 0l-.66 4.675h5.185l.78-4.675h-5.305zM5.73 15.49l-.782 4.675h4.78l.66-4.675H5.73zm5.54 0l-.66 4.675h5.185l.78-4.675h-5.305z"/>
                  </svg>
                </div>
                <div>
                  <CardTitle>eBay</CardTitle>
                  <CardDescription>
                    Crosspost your accepted offers to eBay's marketplace
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ebayStatus.connected ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Connected
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    Not connected
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {ebayStatus.connected ? (
              <>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">eBay Username</span>
                      <span className="text-sm text-muted-foreground">{ebayStatus.ebayUsername}</span>
                    </div>
                    {ebayStatus.lastSyncAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Last Synced</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(ebayStatus.lastSyncAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-crosspost" className="text-base font-medium">
                      Auto-Crosspost
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically list accepted offers on eBay
                    </p>
                  </div>
                  <Switch
                    id="auto-crosspost"
                    checked={ebayStatus.autoCrosspost || false}
                    onCheckedChange={handleToggleAutoCrosspost}
                  />
                </div>

                <div className="pt-4 space-y-2">
                  <Button
                    variant="outline"
                    onClick={handleDisconnectEbay}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect eBay Account'
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Existing listings will remain active on eBay
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your eBay account to start crossposting your accepted offers to
                    eBay's marketplace and reach millions of potential buyers.
                  </p>
                  <ul className="text-sm text-left space-y-2 mb-6 max-w-md mx-auto">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>Automatically create eBay listings from accepted offers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>Sync photos, descriptions, and pricing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>Track listing performance and fees</span>
                    </li>
                  </ul>
                  <Button
                    onClick={handleConnectEbay}
                    disabled={actionLoading}
                    size="lg"
                    className="w-full max-w-xs"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        Connect eBay Account
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              To connect your eBay account, you'll need to authorize JakeBuysIt to create listings
              on your behalf. You can revoke this access at any time from your eBay account settings.
            </p>
            <p>
              <strong>Note:</strong> eBay may charge listing fees based on your seller tier.
              You'll see estimated fees before confirming each crosspost.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
