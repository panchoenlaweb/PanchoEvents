import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { AdminClient } from './AdminClient';

export default async function AdminPage() {
  const user = await getServerUser();
  if (!user || user.role !== 'admin') redirect('/login');
  return <AdminClient adminUser={user} />;
}
