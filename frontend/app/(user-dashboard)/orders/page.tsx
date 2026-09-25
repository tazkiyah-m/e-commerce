import { Suspense } from 'react';
import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex w-full min-h-[50vh] items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    }>
      <OrdersClient />
    </Suspense>
  );
}
