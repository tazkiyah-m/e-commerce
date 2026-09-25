import { Suspense } from 'react';
import MenuClient from './MenuClient';

export const dynamic = 'force-dynamic';

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><p>Memuat menu...</p></div>}>
      <MenuClient />
    </Suspense>
  );
}
