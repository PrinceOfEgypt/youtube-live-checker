// app/page.tsx
import LiveStatus from '@/components/LiveStatus';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <LiveStatus />
    </main>
  );
}