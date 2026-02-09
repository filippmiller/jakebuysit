'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { UserDetail } from '@/components/user-detail';
import { fetchUserById } from '@/lib/admin-api';
import type { UserData } from '@/types/user';

export default function UserDetailPage() {
  const params = useParams();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await fetchUserById(params.id as string);
        setUser(data);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [params.id]);

  if (loading) {
    return <div>Loading user details...</div>;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return <UserDetail user={user} />;
}
