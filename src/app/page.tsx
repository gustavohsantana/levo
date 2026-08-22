import { redirect } from 'next/navigation';
import { getSession } from '@/presentation/http/session';

export default async function Home() {
  redirect((await getSession()) ? '/dashboard' : '/login');
}
