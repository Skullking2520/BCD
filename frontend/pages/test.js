export default function Test() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🎮 Game Items Trading Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Frontend is working! 🎉
        </p>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Test Page
          </h2>
          <p className="text-gray-600">
            If you can see this page, the frontend is running correctly.
          </p>
          <div className="mt-4 p-4 bg-green-100 rounded-lg">
            <p className="text-green-800 font-semibold">
              ✅ Frontend Status: Running
            </p>
            <p className="text-green-700 text-sm">
              Port: 3000 | Next.js: 14.2.30
            </p>
          </div>
          <div className="mt-4 p-4 bg-blue-100 rounded-lg">
            <p className="text-blue-800 font-semibold">
              📋 Available Pages:
            </p>
            <ul className="text-blue-700 text-sm mt-2 space-y-1">
              <li>• <a href="/" className="underline">Home Page</a> - Main DApp</li>
              <li>• <a href="/test" className="underline">Test Page</a> - This page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 