import React, { useState } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Calling your Express backend route
      const response = await fetch(`http://localhost:5000/api/emails/search?q=${query}`);
      const data = await response.json();
      setEmails(data);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-blue-400">Gmail Dashboard</h1>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-4 mb-10">
          <input 
            type="text" 
            placeholder="Search emails (e.g. amazon, github)..."
            className="flex-1 p-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-semibold transition"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Results Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
          <table className="w-full text-left">
            <thead className="bg-gray-700 text-gray-300 uppercase text-sm">
              <tr>
                <th className="p-4">Sender</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {emails.length > 0 ? emails.map((email) => (
                <tr key={email.id} className="border-t border-gray-700 hover:bg-gray-750 transition">
                  <td className="p-4 text-sm font-medium text-blue-300">{email.from}</td>
                  <td className="p-4 text-sm">
                    <div className="font-semibold">{email.subject}</div>
                    <div className="text-gray-400 text-xs truncate w-64">{email.snippet}</div>
                  </td>
                  <td className="p-4 text-xs text-gray-500">{new Date(email.date).toLocaleDateString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" className="p-10 text-center text-gray-500">
                    No emails found. Try searching for a keyword above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;