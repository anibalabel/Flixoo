import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-6xl font-black mb-4">404</h1>
        <p className="text-gray-400 mb-8">Página no encontrada</p>
        <Link href="/" className="px-6 py-3 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
