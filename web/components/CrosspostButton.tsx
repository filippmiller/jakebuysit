'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api-client';
import { ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface CrosspostButtonProps {
  offerId: string;
  ebayListingId?: string;
  ebayListingUrl?: string;
  ebayStatus?: 'pending' | 'success' | 'failed';
  ebayError?: string;
  onSuccess?: (data: { itemId: string; listingUrl: string; fees: number }) => void;
}

export function CrosspostButton({
  offerId,
  ebayListingId,
  ebayListingUrl,
  ebayStatus,
  ebayError,
  onSuccess,
}: CrosspostButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    itemId: string;
    listingUrl: string;
    fees: number;
  } | null>(null);

  const handleCrosspost = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.post<{
        success: boolean;
        itemId: string;
        listingUrl: string;
        fees: number;
        message: string;
      }>(`/integrations/ebay/crosspost/${offerId}`, {});

      setSuccess({
        itemId: result.itemId,
        listingUrl: result.listingUrl,
        fees: result.fees,
      });

      if (onSuccess) {
        onSuccess({
          itemId: result.itemId,
          listingUrl: result.listingUrl,
          fees: result.fees,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to crosspost to eBay');
    } finally {
      setLoading(false);
    }
  };

  // Already crossposted
  if (ebayListingId && ebayListingUrl && ebayStatus === 'success') {
    return (
      <Button variant="outline" asChild>
        <a href={ebayListingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          View on eBay
          <ExternalLink className="h-3 w-3" />
        </a>
      </Button>
    );
  }

  // Crosspost failed
  if (ebayStatus === 'failed') {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="text-red-600 border-red-600"
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          Crosspost Failed - Retry
        </Button>
        {ebayError && (
          <p className="text-xs text-red-600">{ebayError}</p>
        )}
      </div>
    );
  }

  // Crosspost pending
  if (ebayStatus === 'pending') {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Crossposting to eBay...
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.29 3.77l-.782 4.675h4.78L11.95 3.77H7.29zm5.54 0l-.66 4.675h5.185l.78-4.675h-5.305zM6.51 9.63l-.782 4.675h4.78L11.17 9.63H6.51zm5.54 0l-.66 4.675h5.185l.78-4.675h-5.305zM5.73 15.49l-.782 4.675h4.78l.66-4.675H5.73zm5.54 0l-.66 4.675h5.185l.78-4.675h-5.305z"/>
        </svg>
        Crosspost to eBay
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crosspost to eBay</DialogTitle>
            <DialogDescription>
              This will create a fixed-price listing on eBay using your offer details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {success ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Successfully listed on eBay!</p>
                    <p className="text-sm">Item ID: {success.itemId}</p>
                    <p className="text-sm">Listing fees: ${success.fees.toFixed(2)}</p>
                    <a
                      href={success.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View listing on eBay
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </AlertDescription>
              </Alert>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <h4 className="font-medium">What will be included:</h4>
                  <ul className="space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>All product photos</li>
                    <li>Item description and condition</li>
                    <li>Your offer price as "Buy It Now"</li>
                    <li>Free shipping</li>
                    <li>30-day returns accepted</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-2">
                  <h4 className="font-medium text-yellow-900">eBay Fees</h4>
                  <p className="text-sm text-yellow-700">
                    eBay may charge listing fees and final value fees. You'll see the exact costs
                    after posting. Typical fees range from 10-15% of the sale price.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {success ? (
              <Button onClick={() => setIsOpen(false)}>Close</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleCrosspost} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post to eBay'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
