// app/page.tsx
import LiveStatus from '@/components/LiveStatus';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          YouTube Live Status Checker
        </h1>
        <LiveStatus />
      </div>
    </main>
  );
}