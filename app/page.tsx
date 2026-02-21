import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1B4965] to-[#5FA8D3]">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-center text-[#1B4965] mb-2">Admin Web Panel</h1>
        <p className="text-gray-600 text-center text-sm mb-6">Firma Hukum — Partner, Admin, Finance, Management</p>
        <Link
          href="/login"
          className="block w-full py-3 px-4 bg-[#1B4965] text-white text-center font-medium rounded-lg hover:opacity-90 transition"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
