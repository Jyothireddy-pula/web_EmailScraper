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
    const searchTerm = email.subject || query || 'in:anywhere';
    const url = `${base}${encodeURIComponent(searchTerm)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const quickKeywords = ['invoice', 'meeting', 'from:linkedin', 'subject:offer'];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />
      <div className="bg-orb bg-orb-c" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10">
        <div className="w-full space-y-8">
          <header className="panel-3d flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-300/30 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Search your Gmail by keyword
              </p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
                Next-gen Email Search
                <span className="gradient-text block">
                  Fast. Visual. Intelligent.
                </span>
              </h1>
              <p className="max-w-xl text-sm text-slate-300 md:text-base">
                Step 1: connect your Google account. Step 2: type a keyword.
                Step 3: instantly see matching emails with sender, subject, and
                date.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-xs ring-1 ring-slate-500/50 backdrop-blur">
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
                className="cta-3d inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
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

          <main className="panel-3d overflow-hidden">
            <form
              onSubmit={handleSearch}
              className="flex flex-col gap-3 border-b border-slate-700/60 px-4 py-5 md:px-6 md:py-6"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <div className="glass-pill flex flex-1 items-center gap-3 rounded-full px-4 py-2.5 ring-1 ring-cyan-300/30 focus-within:ring-emerald-400">
                  <span className="text-sm text-slate-500">🔍</span>
                  <input
                    type="text"
                    placeholder='Use Gmail query (e.g. invoice, from:boss, subject:"offer letter")'
                    className="w-full bg-transparent text-sm text-slate-50 placeholder:text-slate-400 outline-none md:text-base"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="cta-3d inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Searching…' : 'Search emails'}
                </button>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span className="mr-1 text-slate-500">
                  Try Gmail search:
                </span>
                {quickKeywords.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleQuickKeyword(term)}
                    className="chip-3d rounded-full px-3 py-1 text-[11px] font-medium text-slate-100"
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
                        className="chip-3d rounded-full px-3 py-1 text-[11px] font-medium text-slate-100"
                      >
                        {term}
                      </button>
                    ))}
                  </>
                )}

                {loading && (
                  <span className="ml-auto text-emerald-300">
                    Searching your inbox...
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

            <section className="space-y-3 px-4 py-4 md:px-6 md:py-5">
              {emails.length > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>
                    Results for{' '}
                    <span className="font-semibold text-cyan-200">
                      "{query}"
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
                  <p className="max-w-sm text-xs text-slate-400">
                    This app uses Gmail's original search query engine. Try
                    broader words or operators like{' '}
                    <span className="font-semibold">from:name</span> and{' '}
                    <span className="font-semibold">subject:invoice</span>.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-950/40 shadow-[0_10px_50px_rgba(34,211,238,0.08)]">
                  <div className="max-h-[460px] overflow-y-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-900/90 text-slate-300 backdrop-blur">
                        <tr>
                          <th className="w-1/4 px-4 py-3 font-medium">
                            Sender
                          </th>
                          <th className="w-1/2 px-4 py-3 font-medium">
                            Subject & preview
                          </th>
                          <th className="w-1/4 px-4 py-3 pr-5 text-right font-medium">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {emails.map((email) => (
                          <tr
                            key={email.id}
                            className="result-row cursor-pointer"
                            onClick={() => handleOpenInGmail(email)}
                          >
                            <td className="break-all px-4 py-3 align-top text-xs text-slate-200 md:text-sm">
                              {email.from}
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="line-clamp-1 text-sm font-medium text-slate-50">
                                    {email.subject}
                                  </div>
                                  <div className="mt-1 line-clamp-2 text-xs text-slate-400">
                                    {email.snippet}
                                  </div>
                                </div>
                                <span className="hidden text-[11px] text-emerald-300 md:inline">
                                  Open in Gmail ↗
                                </span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 pr-5 text-right text-xs text-slate-300 md:text-sm">
                              {new Date(email.date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
                    <span>{emails.length} result(s)</span>
                    <span>Rows are clickable to open in Gmail</span>
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;