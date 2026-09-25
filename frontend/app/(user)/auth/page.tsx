import { Suspense } from 'react';
import AuthClient from './AuthClient';

export const dynamic = 'force-dynamic';

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex w-full min-h-screen items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    }>
      <AuthClient />
    </Suspense>
  );
}
