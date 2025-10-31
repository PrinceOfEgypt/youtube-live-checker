// app/page.tsx
import LiveStatus from '@/components/LiveStatus';

export default function WidgetPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto">
        <LiveStatus />
      </div>
    </main>
  );
}