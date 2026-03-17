import './globals.css';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-indigo-50/70">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-slate-900">404 – Page Not Found</h1>
        <a href="/" className="text-indigo-600 hover:text-indigo-800 underline font-medium">Go back home</a>
      </div>
    </div>
  );
}
