import { redirect } from 'next/navigation';

export default function AdminRoot() {
  // Redirect to dashboard
  redirect('/dashboard');
}
