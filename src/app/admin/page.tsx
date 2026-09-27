import type { Metadata } from 'next';
import AdminApp from '@/components/admin/AdminApp';

export const metadata: Metadata = {
  title: '管理画面 | おごり自販機マッチング',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
