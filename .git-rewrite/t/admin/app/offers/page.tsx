'use client';

import { useState } from 'react';
import { OfferTable } from '@/components/offer-table';
import { OfferFilters } from '@/components/offer-filters';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function OffersPage() {
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    confidence: 'all',
    dateRange: null,
    search: '',
  });

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    console.log('Exporting offers to CSV...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offers Management</h1>
          <p className="text-muted-foreground">
            View and manage all offers in the system
          </p>
        </div>
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <OfferFilters filters={filters} onChange={setFilters} />

      <OfferTable filters={filters} />
    </div>
  );
}
