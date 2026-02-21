'use client';

import { useRouter } from 'next/navigation';

export default function Header(props: { title: string }) {
  const router = useRouter();
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-gray-800">{props.title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">Admin</span>
        <button type="button" onClick={() => router.push('/login')} className="text-sm text-[#1B4965] hover:underline">
          Logout
        </button>
      </div>
    </header>
  );
}
