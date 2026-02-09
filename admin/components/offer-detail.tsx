'use client';

import { useState } from 'react';
import { OfferData } from '@/types/offer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Play, Edit, AlertTriangle, Ban, Flag, FileText, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface OfferDetailProps {
  offer: OfferData;
}

export function OfferDetail({ offer }: OfferDetailProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const nextPhoto = () => {
    setCurrentPhotoIndex((i) => (i + 1) % offer.photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((i) => (i - 1 + offer.photos.length) % offer.photos.length);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offer Details</h1>
          <p className="text-muted-foreground">
            {offer.identification.brand} {offer.identification.model}
          </p>
        </div>
        <Badge variant={offer.status === 'escalated' ? 'warning' : 'default'}>
          {offer.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN - Item Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <img
                  src={offer.photos[currentPhotoIndex]}
                  alt={`Photo ${currentPhotoIndex + 1}`}
                  className="w-full h-64 object-cover rounded-lg"
                />
                {offer.photos.length > 1 && (
                  <div className="absolute inset-0 flex items-center justify-between p-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={prevPhoto}
                      className="opacity-75 hover:opacity-100"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={nextPhoto}
                      className="opacity-75 hover:opacity-100"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="mt-2 text-center text-sm text-muted-foreground">
                  Photo {currentPhotoIndex + 1} of {offer.photos.length}
                </div>
              </div>
            </CardContent>
          </Card>

          {offer.userDescription && (
            <Card>
              <CardHeader>
                <CardTitle>User Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{offer.userDescription}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>AI Identification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-sm">{offer.identification.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subcategory</p>
                <p className="text-sm">{offer.identification.subcategory}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Brand</p>
                  <p className="text-sm">{offer.identification.brand}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Model</p>
                  <p className="text-sm">{offer.identification.model}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Condition</p>
                <p className="text-sm">{offer.identification.condition}</p>
              </div>
              {offer.identification.features.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Features</p>
                  <ul className="list-disc list-inside text-sm">
                    {offer.identification.features.map((feature, i) => (
                      <li key={i}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
              {offer.identification.damageNotes.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Damage Notes</p>
                  <ul className="list-disc list-inside text-sm text-destructive">
                    {offer.identification.damageNotes.map((note, i) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Confidence Score</p>
                  <p className="text-lg font-bold">{offer.identification.confidence}%</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Model: {offer.identification.modelUsed}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CENTER COLUMN - Pricing Breakdown */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fair Market Value</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">FMV</p>
                <p className="text-xl font-bold">{formatCurrency(offer.pricing.fmv)}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">eBay sold median</span>
                  <span>
                    {formatCurrency(offer.pricing.ebayMedian)}{' '}
                    <Link
                      href="#"
                      className="text-primary hover:underline text-xs"
                    >
                      ({offer.pricing.ebayListingCount} listings)
                    </Link>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amazon used avg</span>
                  <span>{formatCurrency(offer.pricing.amazonAvg)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Google Shopping avg</span>
                  <span>{formatCurrency(offer.pricing.googleShoppingAvg)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Condition Multiplier</span>
                <span>{(offer.pricing.conditionMultiplier * 100).toFixed(0)}% ({offer.identification.condition})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category Margin</span>
                <span>{(offer.pricing.categoryMargin * 100).toFixed(0)}%</span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Dynamic Adjustments</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Velocity bonus</span>
                    <span className="text-green-600">+{(offer.pricing.dynamicAdjustments.velocityBonus * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inventory saturation</span>
                    <span>{(offer.pricing.dynamicAdjustments.inventorySaturation * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User loyalty</span>
                    <span className="text-green-600">+{(offer.pricing.dynamicAdjustments.loyaltyBonus * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-lg font-semibold">Final Offer</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(offer.pricing.finalOffer)}</p>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Offer-to-Market Ratio</span>
                  <span>{(offer.pricing.offerToMarketRatio * 100).toFixed(0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - Jake & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Jake Voice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {offer.jake.audioUrl && (
                <div>
                  <Button className="w-full" size="lg">
                    <Play className="mr-2 h-4 w-4" />
                    Play Jake Offer
                  </Button>
                  <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Tier {offer.jake.tier}</span>
                    <span>{offer.jake.played ? 'Played' : 'Not played'}</span>
                  </div>
                </div>
              )}
              <div className="pt-3 border-t">
                <p className="text-sm font-medium mb-2">Script</p>
                <p className="text-sm text-muted-foreground">{offer.jake.script}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                Animation: {offer.jake.animationState}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing started</span>
                <span>{formatDistanceToNow(new Date(offer.timeline.processingStarted), { addSuffix: true })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vision complete</span>
                <span>{formatDistanceToNow(new Date(offer.timeline.visionComplete), { addSuffix: true })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Research complete</span>
                <span>{formatDistanceToNow(new Date(offer.timeline.marketplaceResearchComplete), { addSuffix: true })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Offer ready</span>
                <span>{formatDistanceToNow(new Date(offer.timeline.offerReady), { addSuffix: true })}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Edit className="mr-2 h-4 w-4" />
                Edit Offer Amount
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Escalate to Reviewer
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive">
                <Ban className="mr-2 h-4 w-4" />
                Reject Offer
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive">
                <Flag className="mr-2 h-4 w-4" />
                Flag Fraud
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                View Audit Log
              </Button>
              <Link href={`/users/${offer.userId}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View User Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
