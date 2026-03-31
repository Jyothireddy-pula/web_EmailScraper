import React, { useState, useEffect } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState(
    localStorage.getItem('userEmail') || ''
  );
  const [recentQueries, setRecentQueries] = useState(() => {
    try {
      const stored = localStorage.getItem('recentQueries');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    if (email) {
      setUserEmail(email);
      localStorage.setItem('userEmail', email);
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  const isConnected = Boolean(userEmail);

  const updateRecentQueries = (term) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    const next = [trimmed, ...recentQueries.filter((q) => q !== trimmed)].slice(
      0,
      5
    );
    setRecentQueries(next);
    try {
      localStorage.setItem('recentQueries', JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const runSearch = async (term) => {
    const keyword = term ?? query;

    if (!isConnected) {
      alert('Please connect your Google account first.');
      return;
    }

    if (!keyword.trim()) {
      alert('Type a keyword to search.');
      return;
    }

    setQuery(keyword);
    setLoading(true);
    try {
      const apiUrl =
        import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(
        `${apiUrl}/api/emails/search?q=${encodeURIComponent(
          keyword
        )}&email=${encodeURIComponent(userEmail)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setEmails(data);
      updateRecentQueries(keyword);
    } catch (error) {
      console.error('Search failed:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    runSearch();
  };

  const handleQuickKeyword = (term) => {
    runSearch(term);
  };

  const handleOpenInGmail = (email) => {
    const base = 'https://mail.google.com/mail/u/0/#search/';
    const searchTerm =
      email.subject || query || 'in:anywhere';
    const url = `${base}${encodeURIComponent(searchTerm)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const quickKeywords = ['invoice', 'meeting', 'from:linkedin', 'subject:offer'];

  return (
    <div className="min-h-screen bg-slate-950/95 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-6xl space-y-8">
        {/* Top section: title + connect */}
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Search your Gmail by keyword
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Email search assistant
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-xl">
              Step 1: connect your Google account. Step 2: type a keyword.
              Step 3: instantly see matching emails with sender, subject, and
              date.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-xs ring-1 ring-slate-700">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
              />
              <span className="text-slate-300">
                {isConnected
                  ? `Connected: ${userEmail}`
                  : 'Not connected to Gmail'}
              </span>
            </div>
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
              {isConnected ? 'Reconnect Google' : 'Connect your Gmail'}
            </button>
            <p className="text-xs text-slate-400">
              {isConnected
                ? 'You can now search your inbox safely from this page.'
                : 'Required once so we can read your emails securely.'}
            </p>
          </div>
        </header>

        {/* Card: search + results */}
        <main className="rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl shadow-emerald-500/10 backdrop-blur-sm">
          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 md:px-6 md:py-5"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              <div className="flex-1 flex items-center gap-3 rounded-full bg-slate-900/80 px-4 py-2 ring-1 ring-slate-700 focus-within:ring-emerald-500">
                <span className="text-slate-500 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder='Use Gmail query (e.g. invoice, from:boss, subject:"offer letter")'
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
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
              <span className="mr-1 text-slate-500">
                Try Gmail search:
              </span>
              {quickKeywords.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleQuickKeyword(term)}
                  className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-700"
                >
                  {term}
                </button>
              ))}

              {recentQueries.length > 0 && (
                <>
                  <span className="mx-1 h-3 w-px bg-slate-700" />
                  <span className="mr-1 text-slate-500">
                    Recent:
                  </span>
                  {recentQueries.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleQuickKeyword(term)}
                      className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-700"
                    >
                      {term}
                    </button>
                  ))}
                </>
              )}

              {loading && (
                <span className="ml-auto text-emerald-300">
                  Searching your inbox…
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Supports Gmail operators like <span className="text-slate-300">from:</span>,{' '}
              <span className="text-slate-300">to:</span>,{' '}
              <span className="text-slate-300">subject:</span>,{' '}
              <span className="text-slate-300">has:attachment</span>, and exact phrases in quotes.
            </p>
          </form>

          {/* Results */}
          <section className="px-4 py-4 md:px-6 md:py-5 space-y-3">
            {emails.length > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Results for{' '}
                  <span className="font-semibold text-slate-100">
                    “{query}”
                  </span>
                </span>
                <span>{emails.length} email(s) found</span>
              </div>
            )}

            {emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <p className="text-sm font-medium text-slate-100">
                  {query && !loading
                    ? 'No emails match this keyword.'
                    : 'Start by connecting your inbox and running a search.'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  This app uses Gmail's original search query engine. Try
                  broader words or operators like{' '}
                  <span className="font-semibold">from:name</span> and{' '}
                  <span className="font-semibold">subject:invoice</span>.
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
                        <th className="px-4 py-3 font-medium w-1/4 text-right pr-5">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {emails.map((email) => (
                        <tr
                          key={email.id}
                          className="hover:bg-slate-900/80 transition-colors cursor-pointer"
                          onClick={() => handleOpenInGmail(email)}
                        >
                          <td className="px-4 py-3 align-top text-xs md:text-sm text-slate-200 break-all">
                            {email.from}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-medium text-slate-50 line-clamp-1">
                                  {email.subject}
                                </div>
                                <div className="mt-1 text-xs text-slate-400 line-clamp-2">
                                  {email.snippet}
                                </div>
                              </div>
                              <span className="text-[11px] text-emerald-300 hidden md:inline">
                                Open in Gmail ↗
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-xs md:text-sm text-slate-300 whitespace-nowrap text-right pr-5">
                            {new Date(email.date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{emails.length} result(s)</span>
                  <span>Rows are clickable to open in Gmail</span>
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