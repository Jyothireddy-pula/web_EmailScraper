import React, { useState, useEffect } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState(
    localStorage.getItem('userEmail') || ''
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    if (email) {
      setUserEmail(email);
      localStorage.setItem('userEmail', email);
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!userEmail) {
      alert("Please connect your Google account first.");
      return;
    }

    if (!query.trim()) {
      alert("Type a keyword to search.");
      return;
    }

    setLoading(true);
    try {
      const apiUrl =
        import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(
        `${apiUrl}/api/emails/search?q=${encodeURIComponent(
          query
        )}&email=${encodeURIComponent(userEmail)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setEmails(data);
    } catch (error) {
      console.error('Search failed:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isConnected = Boolean(userEmail);

  return (
    <div className="min-h-screen bg-slate-950/95 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl space-y-8">
        {/* Top section: title + connect */}
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Email insight in seconds
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Email Scraper
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-xl">
              Connect your inbox, type a keyword, and instantly see
              matching emails with sender, subject, and date. No clutter,
              no confusion.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = `${
                  import.meta.env.VITE_API_URL || 'http://localhost:5000'
                }/auth/google`;
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 hover:bg-white"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                className="h-5 w-5"
                alt="Google"
              />
              {isConnected ? 'Reconnect Google' : 'Connect with Google'}
            </button>
            <p className="text-xs text-slate-400">
              {isConnected
                ? `Signed in as ${userEmail}`
                : 'Required once to read your emails securely.'}
            </p>
          </div>
        </header>

        {/* Card: search + results */}
        <main className="rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl shadow-emerald-500/10 backdrop-blur-sm">
          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 md:flex-row md:items-center md:px-6 md:py-5"
          >
            <div className="flex-1 flex items-center gap-3 rounded-full bg-slate-900/80 px-4 py-2 ring-1 ring-slate-700 focus-within:ring-emerald-500">
              <span className="text-slate-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Search by keyword (e.g. invoice, meeting, offer)"
                className="w-full bg-transparent text-sm md:text-base text-slate-50 placeholder:text-slate-500 outline-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-sm hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Searching…' : 'Search emails'}
            </button>
          </form>

          {/* Results */}
          <section className="px-4 py-4 md:px-6 md:py-5">
            {emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <p className="text-sm font-medium text-slate-100">
                  {query && !loading
                    ? 'No emails match this keyword.'
                    : 'Start by connecting your inbox and running a search.'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Try simple words you would use in real life, like
                  &nbsp;<span className="font-semibold">"invoice"</span>,&nbsp;
                  <span className="font-semibold">"meeting"</span>, or&nbsp;
                  <span className="font-semibold">"job"</span>.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
                <div className="max-h-[460px] overflow-y-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-900/80 text-slate-300 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 font-medium w-1/4">
                          Sender
                        </th>
                        <th className="px-4 py-3 font-medium w-1/2">
                          Subject & preview
                        </th>
                        <th className="px-4 py-3 font-medium w-1/4">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {emails.map((email) => (
                        <tr
                          key={email.id}
                          className="hover:bg-slate-900/80 transition-colors"
                        >
                          <td className="px-4 py-3 align-top text-xs md:text-sm text-slate-200 break-all">
                            {email.from}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="text-sm font-medium text-slate-50 line-clamp-1">
                              {email.subject}
                            </div>
                            <div className="mt-1 text-xs text-slate-400 line-clamp-2">
                              {email.snippet}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-xs md:text-sm text-slate-300 whitespace-nowrap">
                            {new Date(email.date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{emails.length} result(s)</span>
                  <span>Showing most recent first</span>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;