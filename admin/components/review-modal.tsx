'use client';

import { useState } from 'react';
import { EscalatedOffer, EscalationDecision } from '@/types/escalation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { adminAPI } from '@/lib/admin-api';
import { Check, X, DollarSign, Flag, MessageSquare } from 'lucide-react';

interface ReviewModalProps {
  escalation: EscalatedOffer;
  onClose: () => void;
}

export function ReviewModal({ escalation, onClose }: ReviewModalProps) {
  const [decision, setDecision] = useState<string>('');
  const [customPrice, setCustomPrice] = useState(escalation.suggestedOffer.toString());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!decision) return;

    setLoading(true);
    try {
      const payload: EscalationDecision = {
        action: decision as any,
        notes,
      };

      if (decision === 'custom') {
        payload.customPrice = parseFloat(customPrice);
        if (!payload.reason) {
          payload.reason = notes;
        }
      }

      await adminAPI.resolveEscalation(escalation.id, payload);
      onClose();
    } catch (error) {
      console.error('Failed to resolve escalation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Escalation</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT: Offer Details */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Offer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <img
                  src={escalation.offer.photos[0]}
                  alt="Item"
                  className="w-full h-40 object-cover rounded"
                />
                <div>
                  <p className="font-medium">
                    {escalation.offer.identification.brand}{' '}
                    {escalation.offer.identification.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {escalation.offer.identification.category}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User</p>
                  <p className="text-sm">{escalation.offer.userEmail}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Condition</p>
                  <p className="text-sm">{escalation.offer.identification.condition}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AI Confidence</p>
                  <p className="text-sm">{escalation.offer.identification.confidence}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CENTER: AI Reasoning */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Suggestion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground">Suggested Offer</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(escalation.suggestedOffer)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">AI Reasoning</p>
                  <p className="text-sm text-muted-foreground">
                    {escalation.aiReasoning}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Market Data</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FMV</span>
                      <span>{formatCurrency(escalation.offer.pricing.fmv)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Offer Ratio</span>
                      <span>{(escalation.offer.pricing.offerToMarketRatio * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {escalation.previousReviews && escalation.previousReviews.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Previous Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {escalation.previousReviews.map((review, i) => (
                      <div key={i} className="text-sm p-2 border rounded">
                        <p className="font-medium">{review.reviewedBy}</p>
                        <p className="text-muted-foreground">{review.notes}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {review.reviewedAt}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Decision Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Button
                    variant={decision === 'approve' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setDecision('approve')}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Approve Suggested Offer
                  </Button>
                  <Button
                    variant={decision === 'custom' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setDecision('custom')}
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Custom Price
                  </Button>
                  <Button
                    variant={decision === 'reject' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setDecision('reject')}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject Offer
                  </Button>
                  <Button
                    variant={decision === 'fraud' ? 'default' : 'outline'}
                    className="w-full justify-start text-destructive"
                    onClick={() => setDecision('fraud')}
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    Flag as Fraud
                  </Button>
                  <Button
                    variant={decision === 'request_more_info' ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => setDecision('request_more_info')}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Request More Info
                  </Button>
                </div>

                {decision === 'custom' && (
                  <div className="pt-3 border-t">
                    <Label htmlFor="customPrice">Custom Offer Amount</Label>
                    <Input
                      id="customPrice"
                      type="number"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                <div className="pt-3 border-t">
                  <Label htmlFor="notes">Notes / Reason</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes visible to other admins..."
                    className="mt-1"
                    rows={4}
                  />
                </div>

                <div className="pt-3 border-t flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={!decision || loading}
                    className="flex-1"
                  >
                    {loading ? 'Submitting...' : 'Submit Decision'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
