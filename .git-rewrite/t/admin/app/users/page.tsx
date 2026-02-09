'use client';

import { UserTable } from '@/components/user-table';
import { UserFilters } from '@/components/user-filters';
import { useState } from 'react';

export default function UsersPage() {
  const [filters, setFilters] = useState({
    trustScore: 'all',
    familiarity: 'all',
    dateRange: null,
    search: '',
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          View user profiles, trust scores, and offer history
        </p>
      </div>

      <UserFilters filters={filters} onChange={setFilters} />

      <UserTable filters={filters} />
    </div>
  );
}
