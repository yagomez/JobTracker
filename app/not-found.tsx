import './globals.css';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-olive-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-olive-900">404 – Page Not Found</h1>
        <a href="/" className="text-olive-600 hover:text-olive-800 underline">Go back home</a>
      </div>
    </div>
  );
}
