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
  const [pinnedQueries, setPinnedQueries] = useState(() => {
    try {
      const stored = localStorage.getItem('pinnedQueries');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [pinnedEmails, setPinnedEmails] = useState(() => {
    try {
      const stored = localStorage.getItem('pinnedEmails');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeFilter, setActiveFilter] = useState('all');
  const [deadlines, setDeadlines] = useState([]);
  const [smartAlerts, setSmartAlerts] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailSummary, setEmailSummary] = useState('');
  const [autoReply, setAutoReply] = useState('');
  const [replyTone, setReplyTone] = useState('professional');
  const [replyLanguage, setReplyLanguage] = useState('english');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [aiService, setAiService] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  const removeRecentQuery = (term) => {
    const next = recentQueries.filter((q) => q !== term);
    setRecentQueries(next);
    try {
      localStorage.setItem('recentQueries', JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const togglePinQuery = (term) => {
    const isPinned = pinnedQueries.includes(term);
    let next;
    if (isPinned) {
      next = pinnedQueries.filter((q) => q !== term);
    } else {
      next = [...pinnedQueries, term].slice(0, 3);
    }
    setPinnedQueries(next);
    try {
      localStorage.setItem('pinnedQueries', JSON.stringify(next));
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

    // Process smart search
    const processedQuery = processSmartSearch(keyword);
    setQuery(processedQuery);
    setLoading(true);
    try {
      const apiUrl =
        import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(
        `${apiUrl}/api/emails/search?q=${encodeURIComponent(
          processedQuery
        )}&email=${encodeURIComponent(userEmail)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      // Enhance emails with categories and importance
      const enhancedEmails = data.map(email => ({
        ...email,
        category: categorizeEmail(email),
        isImportant: isImportantEmail(email),
        summary: generateSummary(email)
      }));

      // Sort: important emails first
      enhancedEmails.sort((a, b) => {
        if (a.isImportant && !b.isImportant) return -1;
        if (!a.isImportant && b.isImportant) return 1;
        return 0;
      });

      setEmails(enhancedEmails);
      
      // Update deadlines and alerts
      const foundDeadlines = detectDeadlines(enhancedEmails);
      const foundAlerts = generateSmartAlerts(enhancedEmails);
      setDeadlines(foundDeadlines);
      setSmartAlerts(foundAlerts);
      
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

  // Smart Search - Convert natural language to Gmail search
  const processSmartSearch = (input) => {
    const lowerInput = input.toLowerCase();
    
    // Academic keywords
    if (lowerInput.includes('deadline') || lowerInput.includes('test') || lowerInput.includes('exam') || lowerInput.includes('assignment')) {
      return `(${lowerInput.includes('deadline') ? 'deadline OR ' : ''}${lowerInput.includes('test') ? 'test OR ' : ''}${lowerInput.includes('exam') ? 'exam OR ' : ''}${lowerInput.includes('assignment') ? 'assignment' : ''})`;
    }
    
    // Sender-based search
    if (lowerInput.includes('sir') || lowerInput.includes('professor') || lowerInput.includes('faculty')) {
      return '(from:sir OR from:professor OR from:faculty OR from:teacher)';
    }
    
    // Placement keywords
    if (lowerInput.includes('placement') || lowerInput.includes('internship') || lowerInput.includes('job')) {
      return `(placement OR internship OR job OR career)`;
    }
    
    // Week-based search
    if (lowerInput.includes('this week') || lowerInput.includes('week')) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return `after:${weekAgo.toISOString().split('T')[0]}`;
    }
    
    // Return original if no smart pattern matches
    return input;
  };

  // Email categorization
  const categorizeEmail = (email) => {
    const subject = (email.subject || '').toLowerCase();
    const from = (email.from || '').toLowerCase();
    const text = `${subject} ${from}`;
    
    // Academic
    if (text.includes('assignment') || text.includes('test') || text.includes('exam') || 
        text.includes('lecture') || text.includes('class') || text.includes('study') ||
        text.includes('homework') || text.includes('grades') || text.includes('course')) {
      return 'academic';
    }
    
    // Placement
    if (text.includes('placement') || text.includes('internship') || text.includes('job') ||
        text.includes('career') || text.includes('interview') || text.includes('recruitment') ||
        text.includes('offer') || text.includes('hiring')) {
      return 'placement';
    }
    
    // Announcements
    if (text.includes('announcement') || text.includes('notice') || text.includes('circular') ||
        text.includes('important') || text.includes('alert') || text.includes('update') ||
        text.includes('news') || text.includes('information')) {
      return 'announcement';
    }
    
    return 'others';
  };

  // Important email detection
  const isImportantEmail = (email) => {
    const subject = (email.subject || '').toLowerCase();
    const snippet = (email.snippet || '').toLowerCase();
    const text = `${subject} ${snippet}`;
    
    const importantKeywords = ['urgent', 'deadline', 'mandatory', 'last date', 'immediate', 
                               'asap', 'important', 'critical', 'required', 'must'];
    
    return importantKeywords.some(keyword => text.includes(keyword));
  };

  // Generate email summary
  const generateSummary = (email) => {
    const snippet = email.snippet || '';
    if (snippet.length <= 100) return snippet;
    return snippet.substring(0, 100) + '...';
  };

  // Deadline detection
  const detectDeadlines = (emails) => {
    const deadlineKeywords = ['deadline', 'last date', 'submit before', 'due by', 'submission'];
    const foundDeadlines = [];
    
    emails.forEach(email => {
      const text = `${email.subject || ''} ${email.snippet || ''}`.toLowerCase();
      if (deadlineKeywords.some(keyword => text.includes(keyword))) {
        foundDeadlines.push({
          id: email.id,
          subject: email.subject,
          date: email.date
        });
      }
    });
    
    return foundDeadlines;
  };

  // Smart alerts generation
  const generateSmartAlerts = (emails) => {
    const alerts = [];
    const today = new Date().toDateString();
    
    emails.forEach(email => {
      const emailDate = new Date(email.date).toDateString();
      const subject = (email.subject || '').toLowerCase();
      
      // Test today alert
      if (emailDate === today && (subject.includes('test') || subject.includes('exam'))) {
        alerts.push({
          id: `test-${email.id}`,
          type: 'test',
          message: '⚠️ Test today',
          emailId: email.id
        });
      }
      
      // Placement update alert
      if (subject.includes('placement') || subject.includes('interview') || subject.includes('offer')) {
        alerts.push({
          id: `placement-${email.id}`,
          type: 'placement',
          message: '📢 New placement update',
          emailId: email.id
        });
      }
    });
    
    return alerts;
  };

  // Toggle pin email
  const togglePinEmail = (emailId) => {
    const isPinned = pinnedEmails.includes(emailId);
    let next;
    if (isPinned) {
      next = pinnedEmails.filter(id => id !== emailId);
    } else {
      next = [...pinnedEmails, emailId];
    }
    setPinnedEmails(next);
    try {
      localStorage.setItem('pinnedEmails', JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  // Filter emails
  const getFilteredEmails = () => {
    switch (activeFilter) {
      case 'important':
        return emails.filter(email => email.isImportant);
      case 'academic':
        return emails.filter(email => email.category === 'academic');
      case 'placement':
        return emails.filter(email => email.category === 'placement');
      default:
        return emails;
    }
  };

  // Calculate statistics
  const getStatistics = () => {
    const totalEmails = emails.length;
    const importantEmails = emails.filter(email => email.isImportant).length;
    const deadlineCount = deadlines.length;
    
    return {
      total: totalEmails,
      important: importantEmails,
      deadlines: deadlineCount
    };
  };

  // Generate email summary using AI
  const generateEmailSummary = async (email) => {
    setIsAiLoading(true);
    
    try {
      const subject = email.subject || '';
      const snippet = email.snippet || '';
      const fullText = `Subject: ${subject}\n\n${snippet}`;
      
      let summary = '';
      
      if (aiService === 'gemini' && apiKey) {
        // Use Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Please analyze this email and provide a comprehensive summary. Extract the main points, key information, and any action items. Make it clear and professional.\n\nEmail:\n${fullText}`
              }]
            }]
          })
        });
        
        const data = await response.json();
        if (data.candidates && data.candidates[0]) {
          summary = data.candidates[0].content.parts[0].text;
        }
      } else if (aiService === 'chatgpt' && apiKey) {
        // Use ChatGPT API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are an expert email analyst. Provide clear, professional summaries with main points and key information.'
              },
              {
                role: 'user',
                content: `Please analyze this email and provide a comprehensive summary. Extract the main points, key information, and any action items.\n\nEmail:\n${fullText}`
              }
            ],
            max_tokens: 500
          })
        });
        
        const data = await response.json();
        if (data.choices && data.choices[0]) {
          summary = data.choices[0].message.content;
        }
      }
      
      if (!summary) {
        // Fallback to rule-based summary
        summary = `Email regarding: ${subject}. ${snippet.substring(0, 100)}${snippet.length > 100 ? '...' : ''}`;
      }
      
      setEmailSummary(summary);
      return summary;
      
    } catch (error) {
      console.error('Error generating summary:', error);
      setEmailSummary('Failed to generate summary. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Generate auto-reply using AI
  const generateAutoReply = async (email) => {
    setIsAiLoading(true);
    
    try {
      const subject = (email.subject || '').toLowerCase();
      const snippet = (email.snippet || '').toLowerCase();
      const fullText = `${subject} ${snippet}`;
      
      let reply = '';
      
      if (aiService === 'gemini' && apiKey) {
        // Use Gemini API for humanized replies
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Generate a professional, humanized reply to this email. Consider the context: ${replyTone} tone, ${replyLanguage} language.\n\nOriginal Email:\n${fullText}\n\nRequirements:\n1. Be professional and courteous\n2. Address the main points directly\n3. Keep it concise but complete\n4. Use natural language\n5. Sign off appropriately`
              }]
            }]
          })
        });
        
        const data = await response.json();
        if (data.candidates && data.candidates[0]) {
          reply = data.candidates[0].content.parts[0].text;
        }
      } else if (aiService === 'chatgpt' && apiKey) {
        // Use ChatGPT API for humanized replies
        const toneInstructions = {
          professional: 'Generate a professional, formal reply',
          friendly: 'Generate a friendly, casual reply',
          casual: 'Generate a very casual, informal reply'
        };
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: `You are an expert email assistant. Generate ${toneInstructions[replyTone]} in ${replyLanguage} language. The reply should be humanized, professional, and address the email content directly.`
              },
              {
                role: 'user',
                content: `Generate a ${toneInstructions[replyTone]} in ${replyLanguage} language for this email.\n\nOriginal Email:\n${fullText}\n\nRequirements:\n1. Be professional and courteous\n2. Address the main points directly\n3. Keep it concise but complete\n4. Use natural language\n5. Sign off appropriately`
              }
            ],
            max_tokens: 300
          })
        });
        
        const data = await response.json();
        if (data.choices && data.choices[0]) {
          reply = data.choices[0].message.content;
        }
      }
      
      if (!reply) {
        // Fallback to rule-based reply
        if (fullText.includes('deadline') || fullText.includes('submit before')) {
          reply = replyTone === 'professional' 
            ? 'Thank you for the reminder. I acknowledge the deadline and will ensure timely completion of the required tasks.'
            : replyTone === 'friendly'
            ? 'Thanks for letting me know about the deadline! I\'ll make sure to get it done on time.'
            : 'Got it, will finish before the deadline.';
        } else if (fullText.includes('assignment') || fullText.includes('homework')) {
          reply = replyTone === 'professional' 
            ? 'Thank you for the assignment details. I have received the instructions and will begin working on it promptly.'
            : replyTone === 'friendly'
            ? 'Thanks for the assignment! I\'ll get started on it right away.'
            : 'Assignment received, will start work.';
        } else if (fullText.includes('meeting') || fullText.includes('schedule')) {
          reply = replyTone === 'professional' 
            ? 'Thank you for the meeting invitation. I have noted the schedule and will attend as planned.'
            : replyTone === 'friendly'
            ? 'Thanks for the invite! Looking forward to the meeting.'
            : 'Meeting noted, will attend.';
        } else if (fullText.includes('test') || fullText.includes('exam')) {
          reply = replyTone === 'professional' 
            ? 'Thank you for the test information. I have noted the details and will prepare accordingly.'
            : replyTone === 'friendly'
            ? 'Got it, thanks for the test info! I\'ll study and be ready.'
            : 'Test details received, will prepare.';
        } else {
          reply = replyTone === 'professional' 
            ? 'Thank you for your email. I have received the information and will respond as needed.'
            : replyTone === 'friendly'
            ? 'Thanks for the message! I\'ll get back to you if needed.'
            : 'Got it, thanks.';
        }
      }
      
      // Apply language translation if needed
      if (replyLanguage === 'hindi') {
        const translations = {
          'Thank you': 'धन्यवाद',
          'deadline': 'डेडलाइन',
          'assignment': 'असाइनमेंट',
          'meeting': 'मीटिंग',
          'test': 'टेस्ट'
        };
        
        Object.keys(translations).forEach(eng => {
          reply = reply.replace(new RegExp(eng, 'gi'), translations[eng]);
        });
      } else if (replyLanguage === 'telugu') {
        const translations = {
          'Thank you': 'ధనన్యవాద',
          'deadline': 'డెడ్‌లైన్',
          'assignment': 'అస్సైన్‌మెంట్',
          'meeting': 'సమీటింగ్',
          'test': 'పరీక్ష'
        };
        
        Object.keys(translations).forEach(eng => {
          reply = reply.replace(new RegExp(eng, 'gi'), translations[eng]);
        });
      }
      
      setAutoReply(reply);
      return reply;
      
    } catch (error) {
      console.error('Error generating reply:', error);
      setAutoReply('Failed to generate reply. Please try again.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle email selection for summary and reply
  const handleEmailSelect = async (email) => {
    setSelectedEmail(email);
    const summary = await generateEmailSummary(email);
    setEmailSummary(summary);
    const reply = await generateAutoReply(email);
    setAutoReply(reply);
    setShowReplyModal(true);
  };

  // Send reply via Gmail API
  const sendReply = async () => {
    if (!selectedEmail || !autoReply.trim()) {
      alert('Please select an email and generate a reply first.');
      return;
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/emails/send-reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: selectedEmail.from,
          subject: `Re: ${selectedEmail.subject}`,
          message: autoReply,
          userEmail: userEmail
        })
      });
      
      if (response.ok) {
        alert('Reply sent successfully!');
        setShowReplyModal(false);
        setSelectedEmail(null);
        setAutoReply('');
      } else {
        const data = await response.json();
        alert(`Failed to send reply: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply. Please try again.');
    }
  };

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
                    placeholder='Try natural language: "emails from sir", "deadline this week", "placement mails"'
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

                {(pinnedQueries.length > 0 || recentQueries.length > 0) && (
                  <>
                    <span className="mx-1 h-3 w-px bg-slate-700" />
                    <span className="mr-1 text-slate-500">
                      {pinnedQueries.length > 0 ? 'Pinned & Recent:' : 'Recent:'}
                    </span>
                    {[...pinnedQueries, ...recentQueries].map((term) => {
                      const isPinned = pinnedQueries.includes(term);
                      return (
                        <div
                          key={term}
                          className="chip-3d group relative inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium text-slate-100"
                        >
                          <button
                            type="button"
                            onClick={() => handleQuickKeyword(term)}
                            className="flex items-center gap-1"
                          >
                            {isPinned && (
                              <span className="text-emerald-300" title="Pinned">
                                📌
                              </span>
                            )}
                            {term}
                          </button>
                          <div className="absolute -top-1 -right-1 hidden gap-1 group-hover:flex">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinQuery(term);
                              }}
                              className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-xs hover:bg-slate-600"
                              title={isPinned ? 'Unpin' : 'Pin'}
                            >
                              {isPinned ? '📌' : '📍'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRecentQuery(term);
                              }}
                              className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-xs hover:bg-red-500"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {loading && (
                  <span className="ml-auto text-emerald-300">
                    Searching your inbox...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                💡 Smart search understands natural language. Try: "emails from sir", "deadline this week", "placement mails"
              </p>
            </form>

            {/* Dashboard Section */}
            {emails.length > 0 && (
              <div className="px-4 py-3 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="panel-3d p-4">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">📊 Dashboard</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Emails:</span>
                        <span className="font-semibold text-cyan-200">{getStatistics().total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Important:</span>
                        <span className="font-semibold text-red-300">{getStatistics().important}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Deadlines:</span>
                        <span className="font-semibold text-yellow-300">{getStatistics().deadlines}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Smart Alerts */}
                  {smartAlerts.length > 0 && (
                    <div className="panel-3d p-4">
                      <h3 className="text-sm font-semibold text-slate-300 mb-2">🔔 Smart Alerts</h3>
                      <div className="space-y-1">
                        {smartAlerts.slice(0, 3).map(alert => (
                          <div key={alert.id} className="text-xs p-2 rounded border border-slate-700 bg-slate-800/50">
                            {alert.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Deadline Count */}
                  {deadlines.length > 0 && (
                    <div className="panel-3d p-4">
                      <h3 className="text-sm font-semibold text-slate-300 mb-2">📅 Deadlines</h3>
                      <div className="text-xs font-medium text-yellow-300">
                        You have {deadlines.length} deadline{deadlines.length > 1 ? 's' : ''} this week
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      activeFilter === 'all' 
                        ? 'bg-cyan-500 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    All ({emails.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('important')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      activeFilter === 'important' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Important ({getStatistics().important})
                  </button>
                  <button
                    onClick={() => setActiveFilter('academic')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      activeFilter === 'academic' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Academic
                  </button>
                  <button
                    onClick={() => setActiveFilter('placement')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      activeFilter === 'placement' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Placement
                  </button>
                </div>
              </div>
            )}

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
                          <th className="w-1/5 px-4 py-3 font-medium">
                            Sender
                          </th>
                          <th className="w-2/5 px-4 py-3 font-medium">
                            Subject & Summary
                          </th>
                          <th className="w-1/5 px-4 py-3 font-medium">
                            Category
                          </th>
                          <th className="w-1/5 px-4 py-3 pr-5 text-right font-medium">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {getFilteredEmails().map((email) => {
                          const categoryColors = {
                            academic: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
                            placement: 'bg-green-500/20 text-green-300 border-green-400/30',
                            announcement: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
                            others: 'bg-slate-500/20 text-slate-300 border-slate-400/30'
                          };
                          
                          const categoryIcons = {
                            academic: '📚',
                            placement: '💼',
                            announcement: '📢',
                            others: '🧾'
                          };
                          
                          return (
                            <tr
                              key={email.id}
                              className={`result-row cursor-pointer ${email.isImportant ? 'bg-red-900/10' : ''}`}
                              onClick={() => handleOpenInGmail(email)}
                            >
                              <td className="break-all px-4 py-3 align-top text-xs text-slate-200 md:text-sm">
                                <div className="flex items-center gap-2">
                                  {email.isImportant && (
                                    <span className="text-red-400" title="Important">🔴</span>
                                  )}
                                  {email.from}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="line-clamp-1 text-sm font-medium text-slate-50">
                                      {email.subject}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-400">
                                      {email.summary}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEmailSelect(email);
                                      }}
                                      className="p-1 rounded hover:bg-slate-700 text-blue-300"
                                      title="Generate Summary & Reply"
                                    >
                                      📝
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePinEmail(email.id);
                                      }}
                                      className="p-1 rounded hover:bg-slate-700"
                                      title={pinnedEmails.includes(email.id) ? 'Unpin' : 'Pin'}
                                    >
                                      {pinnedEmails.includes(email.id) ? '⭐' : '📌'}
                                    </button>
                                    <span className="hidden text-[11px] text-emerald-300 md:inline">
                                      Open in Gmail ↗
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium border ${categoryColors[email.category]}`}>
                                  {categoryIcons[email.category]}
                                  {email.category.charAt(0).toUpperCase() + email.category.slice(1)}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 pr-5 text-right text-xs text-slate-300 md:text-sm">
                                {new Date(email.date).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
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
      
      {/* Reply Modal */}
      {showReplyModal && selectedEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="panel-3d max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-100">📧 Reply to Email</h3>
              <button
                onClick={() => setShowReplyModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            
            {/* Email Summary */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-300 mb-2">📝 Email Summary</h4>
              <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
                <p className="text-sm text-slate-200">{emailSummary}</p>
                {isAiLoading && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-transparent"></div>
                    <span className="text-xs text-blue-300">Generating AI summary...</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* AI Service Selection */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-300 mb-2">🤖 AI Service</h4>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-400 mb-2">Select AI Service:</label>
                  <div className="flex gap-2">
                    {['gemini', 'chatgpt'].map(service => (
                      <button
                        key={service}
                        onClick={() => setAiService(service)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                          aiService === service
                            ? 'bg-cyan-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {service.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-400 mb-2">API Key:</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Enter ${aiService.toUpperCase()} API key...`}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Reply Options */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-300 mb-2">🤖 Auto Reply Options</h4>
              
              {/* Tone Selection */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-2">Tone:</label>
                <div className="flex gap-2">
                  {['professional', 'friendly', 'casual'].map(tone => (
                    <button
                      key={tone}
                      onClick={() => setReplyTone(tone)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        replyTone === tone
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {tone.charAt(0).toUpperCase() + tone.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Language Selection */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-2">Language:</label>
                <div className="flex gap-2">
                  {['english', 'hindi', 'telugu'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => setReplyLanguage(lang)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        replyLanguage === lang
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Generated Reply */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-slate-400 mb-2">Generated Reply:</label>
                <textarea
                  value={autoReply}
                  onChange={(e) => setAutoReply(e.target.value)}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder:text-slate-500"
                  rows={4}
                  placeholder="Auto-generated reply will appear here..."
                />
                
                {/* AI Enhancement Button */}
                {apiKey && (
                  <button
                    onClick={async () => {
                      setIsAiLoading(true);
                      try {
                        let enhancedReply = '';
                        
                        if (aiService === 'gemini') {
                          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              contents: [{
                                parts: [{
                                  text: `Enhance this reply to be more professional and comprehensive. Original reply: "${autoReply}". Add more details, improve formatting, and make it more impressive.`
                                }]
                              }]
                            })
                          });
                          
                          const data = await response.json();
                          if (data.candidates && data.candidates[0]) {
                            enhancedReply = data.candidates[0].content.parts[0].text;
                          }
                        } else if (aiService === 'chatgpt') {
                          const response = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${apiKey}`,
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              model: 'gpt-3.5-turbo',
                              messages: [
                                {
                                  role: 'system',
                                  content: 'You are an expert email assistant. Enhance the given reply to be more professional, comprehensive, and impressive.'
                                },
                                {
                                  role: 'user',
                                  content: `Enhance this reply to be more professional and comprehensive. Original reply: "${autoReply}". Add more details, improve formatting, and make it more impressive.`
                                }
                              ],
                              max_tokens: 300
                            })
                          });
                          
                          const data = await response.json();
                          if (data.choices && data.choices[0]) {
                            enhancedReply = data.choices[0].message.content;
                          }
                        }
                        
                        if (enhancedReply) {
                          setAutoReply(enhancedReply);
                        }
                      } catch (error) {
                        console.error('Error enhancing reply:', error);
                      } finally {
                        setIsAiLoading(false);
                      }
                    }}
                    disabled={isAiLoading}
                    className="mt-2 px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    {isAiLoading ? '🤖 Enhancing...' : '✨ Generate AI Reply'}
                  </button>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={sendReply}
                  className="cta-3d flex-1 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold"
                >
                  📤 Send Reply
                </button>
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setSelectedEmail(null);
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-full border border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
