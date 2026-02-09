'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface OfferFiltersProps {
  filters: {
    status: string;
    category: string;
    confidence: string;
    dateRange: any;
    search: string;
  };
  onChange: (filters: any) => void;
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'fraud', label: 'Fraud' },
];

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'electronics', label: 'Consumer Electronics' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'phones', label: 'Phones & Tablets' },
  { value: 'fashion', label: 'Clothing & Fashion' },
  { value: 'collectibles', label: 'Collectibles & Vintage' },
  { value: 'books', label: 'Books & Media' },
  { value: 'appliances', label: 'Small Appliances' },
  { value: 'tools', label: 'Tools & Equipment' },
];

const confidenceOptions = [
  { value: 'all', label: 'All Confidence' },
  { value: 'high', label: 'High (>80%)' },
  { value: 'medium', label: 'Medium (60-80%)' },
  { value: 'low', label: 'Low (<60%)' },
];

export function OfferFilters({ filters, onChange }: OfferFiltersProps) {
  const handleReset = () => {
    onChange({
      status: 'all',
      category: 'all',
      confidence: 'all',
      dateRange: null,
      search: '',
    });
  };

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.category !== 'all' ||
    filters.confidence !== 'all' ||
    filters.search !== '';

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-1">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search offers..."
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={filters.category}
            onChange={(e) => onChange({ ...filters, category: e.target.value })}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="confidence">AI Confidence</Label>
          <select
            id="confidence"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={filters.confidence}
            onChange={(e) => onChange({ ...filters, confidence: e.target.value })}
          >
            {confidenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
