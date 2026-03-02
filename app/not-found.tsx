import './globals.css';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-olive-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-white">404 - Page Not Found</h1>
        <a href="/" className="text-olive-200 hover:text-white hover:underline">Go back home</a>
      </div>
    </div>
  );
}
