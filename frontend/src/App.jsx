import React, { useState, useEffect } from 'react';

function App() {
  const [query, setQuery] = useState('');
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');

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
       alert("Please click 'Connect' to log in with Google first!");
       return;
    }

    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/emails/search?q=${query}&email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }
      
      setEmails(data);
    } catch (error) {
      console.error("Search failed:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-gray-900 p-4 md:p-8">
      
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-10 w-auto">
        <button 
          onClick={() => window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/auth/google`}
          className="bg-neon-mint hover:bg-deep-teal hover:text-white text-deep-teal p-3 md:px-6 md:py-3 font-arcade flex text-xl font-bold items-center gap-3 border-4 border-deep-teal transition-colors uppercase tracking-widest cursor-pointer"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-8 h-8 md:w-6 md:h-6 bg-white rounded-full p-0.5 border-2 border-deep-teal" alt="G" />
          <span className="hidden md:block">Connect</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto pt-20 md:pt-8">
        <h1 className="text-5xl md:text-6xl font-bold mb-3 text-deep-teal text-center font-arcade tracking-widest drop-shadow-sm uppercase leading-tight">Email Scrapper</h1>
        <p className="text-lg md:text-2xl font-bold font-arcade mb-8 px-4 text-center text-cyber-pink tracking-widest leading-loose">Scrape Emails like a pro!</p>

        <hr className="border-t-4 border-dashed border-deep-teal/40 my-8"></hr>
        
        <form onSubmit={handleSearch} className="flex gap-4 mb-10 h-14">
          <input 
            type="text" 
            placeholder="Enter Keyword..."
            className="flex-1 px-4 bg-gray-100 border-4 border-deep-teal focus:outline-none focus:bg-white focus:border-neon-mint text-cyber-pink font-bold font-arcade text-2xl uppercase placeholder:text-deep-teal/50"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            type="submit" 
            className="bg-[#FFF58A] hover:bg-[#ffe500] px-8 text-deep-teal font-arcade text-2xl font-bold border-4 border-deep-teal transition-colors uppercase tracking-widest cursor-pointer"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="bg-white border-4 border-deep-teal overflow-hidden">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-cyber-pink text-white font-arcade text-2xl uppercase tracking-widest border-b-4 border-deep-teal">
              <tr>
                <th className="p-4 border-r-4 border-deep-teal w-1/4">Sender</th>
                <th className="p-4 border-r-4 border-deep-teal w-1/2">Subject</th>
                <th className="p-4 w-1/4 truncate">Date</th>
              </tr>
            </thead>
            <tbody>
              {emails.length > 0 ? emails.map((email) => (
                <tr key={email.id} className="border-b-4 border-deep-teal last:border-0 hover:bg-pink-50 transition-colors">
                  <td className="p-4 font-bold text-deep-teal border-r-4 border-deep-teal whitespace-pre-wrap break-all">{email.from}</td>
                  <td className="p-4 border-r-4 border-deep-teal overflow-hidden">
                    <div className="font-black text-xl text-deep-teal mb-1 truncate">{email.subject}</div>
                    <div className="text-gray-600 font-medium text-sm truncate">{email.snippet}</div>
                  </td>
                  <td className="p-4 font-black text-cyber-pink truncate">{new Date(email.date).toLocaleDateString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="3" className="p-16 text-center text-deep-teal font-arcade text-2xl uppercase tracking-wider bg-gray-50">
                    {query && !loading ? "No emails found for that keyword." : "NO EMAILS FOUND... SEARCH A NEW KEYWORD!"}
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