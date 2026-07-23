import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Sparkles, Mail, FileText, PenTool, LayoutTemplate, 
  MessageSquare, Copy, Check, Play, Square, Settings2,
  Trash2, X, ChevronRight, Clock, Bookmark,
  Download, FileDown, Wand2, Volume2, VolumeX, Pause,
  Printer, FileCode
} from 'lucide-react';
import TEMPLATES from './data/templates';

export default function App() {
  // ── Core State ────────────────────────────────────────────────────────────
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState('email');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [audience, setAudience] = useState('general');
  const [language, setLanguage] = useState('english');
  const [creativity, setCreativity] = useState(0.7);

  // ── Generation & Refinement States ────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [output, setOutput] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isRawMode, setIsRawMode] = useState(false);

  // ── Audio / TTS State ─────────────────────────────────────────────────────
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const speechRate = 1.0;

  // ── Persistent Data States ────────────────────────────────────────────────
  const [history, setHistory] = useState([]);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  
  const abortControllerRef = useRef(null);
  const outputEndRef = useRef(null);

  // ── Initialization ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('inkflow_history');
      if (storedHistory) setHistory(JSON.parse(storedHistory));
      
      const storedSaved = localStorage.getItem('inkflow_saved');
      if (storedSaved) setSavedPrompts(JSON.parse(storedSaved));
    } catch (e) {
      console.error('Failed to load from local storage', e);
    }
  }, []);

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('inkflow_history', JSON.stringify(history));
    }
  }, [history]);
  
  useEffect(() => {
    if (savedPrompts.length > 0) {
      localStorage.setItem('inkflow_saved', JSON.stringify(savedPrompts));
    }
  }, [savedPrompts]);

  useEffect(() => {
    if ((isGenerating || isRefining) && outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output, isGenerating, isRefining]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ── Modes Configuration ───────────────────────────────────────────────────
  const MODES = [
    { id: 'email', icon: Mail, label: 'Email', desc: 'Professional emails' },
    { id: 'summary', icon: FileText, label: 'Summary', desc: 'Concise summaries' },
    { id: 'creative', icon: Sparkles, label: 'Creative', desc: 'Creative writing' },
    { id: 'blog', icon: LayoutTemplate, label: 'Blog Post', desc: 'SEO articles' },
    { id: 'social', icon: MessageSquare, label: 'Social', desc: 'Social media' },
  ];

  const PLACEHOLDERS = {
    email: 'Describe the email you need...\n\nExample: Write a follow-up email to a client about project delays.',
    summary: 'Paste the text you want summarized...\n\nExample: Meeting notes that need condensing.',
    creative: 'Describe what you\'d like to create...\n\nExample: A short story about a time traveler.',
    blog: 'What should the blog post be about?\n\nExample: "10 Productivity Tips for Remote Work"',
    social: 'What content do you need?\n\nExample: Twitter thread about the benefits of meditation.',
  };

  // ── Stream Helper ─────────────────────────────────────────────────────────
  const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  const handleStreamRequest = async (url, bodyData, onChunk, onComplete, signal) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) throw new Error(data.error);
          if (data.done) break;
          if (data.text) {
            accumulatedText += data.text;
            onChunk(accumulatedText);
          }
        } catch (e) {
          if (e.message !== 'Unexpected end of JSON input') {
            console.warn('SSE parse warning:', e);
          }
        }
      }
    }

    onComplete(accumulatedText);
  };

  // ── Generation Logic ──────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    if (isGenerating || isRefining) {
      abortControllerRef.current?.abort();
      setIsGenerating(false);
      setIsRefining(false);
      return;
    }

    // Stop TTS if playing
    stopSpeech();

    setIsGenerating(true);
    setOutput('');
    abortControllerRef.current = new AbortController();

    try {
      await handleStreamRequest(
        '/api/generate',
        { prompt, mode, tone, length, audience, language, creativity },
        (currentOutput) => setOutput(currentOutput),
        (finalOutput) => {
          if (finalOutput.trim()) {
            const newItem = {
              id: Date.now().toString(),
              prompt,
              output: finalOutput,
              mode,
              tone,
              audience,
              language,
              timestamp: new Date().toISOString()
            };
            setHistory(prev => [newItem, ...prev].slice(0, 20));
            toast.success('Generation complete');
          }
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (err.name === 'AbortError') {
        toast('Generation stopped', { icon: '⏹' });
      } else {
        toast.error(err.message || 'Failed to generate content');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Prompt Enhancer ───────────────────────────────────────────────────────
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      toast.error('Enter a draft prompt first');
      return;
    }

    setIsEnhancing(true);
    toast.loading('Polishing prompt with AI...', { id: 'enhancing' });
    const controller = new AbortController();

    try {
      await handleStreamRequest(
        '/api/enhance-prompt',
        { prompt, mode },
        (current) => setPrompt(current),
        () => {
          toast.success('Prompt enhanced!', { id: 'enhancing' });
        },
        controller.signal
      );
    } catch (err) {
      toast.error(err.message || 'Failed to enhance prompt', { id: 'enhancing' });
    } finally {
      setIsEnhancing(false);
    }
  };

  // ── Magic Refinements ─────────────────────────────────────────────────────
  const handleMagicRefine = async (action, targetTone = null, targetLang = null) => {
    if (!output.trim()) {
      toast.error('No content to refine');
      return;
    }

    if (isGenerating || isRefining) return;

    stopSpeech();
    setIsRefining(true);
    toast.loading(`Applying action...`, { id: 'refining' });

    abortControllerRef.current = new AbortController();

    try {
      await handleStreamRequest(
        '/api/refine',
        { text: output, action, targetTone, targetLang },
        (current) => setOutput(current),
        () => {
          toast.success('Content updated!', { id: 'refining' });
        },
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (err.name === 'AbortError') {
        toast('Refinement cancelled', { id: 'refining', icon: '⏹' });
      } else {
        toast.error(err.message || 'Refinement failed', { id: 'refining' });
      }
    } finally {
      setIsRefining(false);
    }
  };

  // ── Text-to-Speech Controls ───────────────────────────────────────────────
  const speakContent = () => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-Speech not supported by your browser');
      return;
    }

    if (isSpeaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
      return;
    }

    if (!output.trim()) return;

    window.speechSynthesis.cancel();

    // Strip markdown formatting for cleaner audio playback
    const cleanText = output
      .replace(/[#*`_~>[\]()]/g, ' ')
      .replace(/\n+/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speechRate;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window && isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, mode, tone, length, audience, language, creativity, isGenerating, isRefining]);

  // ── Utility Actions ───────────────────────────────────────────────────────
  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setIsCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(() => toast.error('Failed to copy'));
  };

  const exportAsText = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inkflow-${mode}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as text');
  };
  
  const exportAsMarkdown = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inkflow-${mode}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as Markdown');
  };

  const exportAsHTML = () => {
    if (!output) return;
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>InkFlow AI Document</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1, h2, h3 { color: #4f46e5; }
    code { background: #f1f5f9; padding: 2px 6px; borderRadius: 4px; font-size: 0.9em; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; borderRadius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #6366f1; margin: 0; padding-left: 16px; color: #475569; }
  </style>
</head>
<body>
  ${output.replace(/\n/g, '<br>')}
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inkflow-${mode}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as HTML');
  };

  const printDocument = () => {
    if (!output) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>InkFlow AI Export</title>
          <style>
            body { font-family: Georgia, serif; line-height: 1.8; margin: 2in 1in; font-size: 14pt; color: #111; }
            h1, h2, h3 { font-family: sans-serif; }
          </style>
        </head>
        <body>
          <div>${output.replace(/\n/g, '<br>')}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const savePrompt = () => {
    if (!prompt.trim()) return;
    if (savedPrompts.some(p => p.prompt === prompt)) {
      toast('Prompt already saved', { icon: 'ℹ️' });
      return;
    }
    
    const newItem = {
      id: Date.now().toString(),
      prompt,
      mode,
      timestamp: new Date().toISOString()
    };
    
    setSavedPrompts(prev => [newItem, ...prev].slice(0, 30));
    toast.success('Prompt saved');
  };

  const deleteSavedPrompt = (id, e) => {
    e.stopPropagation();
    setSavedPrompts(prev => prev.filter(p => p.id !== id));
    toast.success('Prompt deleted');
  };

  const loadHistoryItem = (item) => {
    setPrompt(item.prompt);
    setMode(item.mode);
    if (item.tone) setTone(item.tone);
    if (item.audience) setAudience(item.audience);
    if (item.language) setLanguage(item.language);
    setOutput(item.output);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const applyTemplate = (template) => {
    setPrompt(template.prompt);
    setMode(template.mode);
    if (template.tone) setTone(template.tone);
    if (template.audience) setAudience(template.audience);
    setIsTemplatesOpen(false);
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      setHistory([]);
      localStorage.removeItem('inkflow_history');
      toast.success('History cleared');
    }
  };

  // ── Derived Content Analytics ─────────────────────────────────────────────
  const wordCount = output.trim() ? output.trim().split(/\s+/).length : 0;
  const charCount = prompt.length;
  const outputCharCount = output.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Compute Readability Score & Level
  const getReadabilityMetric = () => {
    if (!output || wordCount < 5) return { score: '--', label: 'N/A' };
    const sentences = (output.match(/[.!?]+/g) || []).length || 1;
    const avgWordsPerSentence = wordCount / sentences;
    
    if (avgWordsPerSentence <= 12) return { score: 'Easy', color: '#10b981', desc: 'Casual & Conversational' };
    if (avgWordsPerSentence <= 18) return { score: 'Standard', color: '#3b82f6', desc: 'Clear & Accessible' };
    if (avgWordsPerSentence <= 25) return { score: 'Professional', color: '#8b5cf6', desc: 'Business / Formal' };
    return { score: 'Dense', color: '#f59e0b', desc: 'Academic / Technical' };
  };

  const readability = getReadabilityMetric();

  return (
    <div className="app">
      <Toaster position="top-right" toastOptions={{
        style: {
          background: 'rgba(22, 22, 55, 0.95)',
          color: '#eeeef8',
          border: '1px solid rgba(124, 58, 237, 0.4)',
          backdropFilter: 'blur(12px)',
        }
      }} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header__top-bar">
          <button 
            className="template-btn"
            onClick={() => setIsTemplatesOpen(true)}
          >
            <BookIcon /> Browse Templates
          </button>
        </div>
        
        <div className="header__logo">
          <div className="header__icon"><Sparkles size={28} /></div>
          <h1 className="header__title">InkFlow AI</h1>
        </div>
        <p className="header__subtitle">
          Next-generation AI Content Creation Studio — Real-time streaming, prompt engineering, and intelligent refinements.
        </p>
        <div className="header__badge">
          <span className="header__badge-dot"></span>
          Powered by Gemini 2.0 Flash • Multi-Language & Analytics
        </div>
      </header>

      {/* ── Mode Selector ───────────────────────────────────────────────── */}
      <section className="modes">
        <p className="modes__label">Select Content Mode</p>
        <div className="modes__grid">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                className={`mode-card ${mode === m.id ? 'active' : ''}`}
                onClick={() => setMode(m.id)}
              >
                <div className="mode-card__icon"><Icon size={24} /></div>
                <div className="mode-card__name">{m.label}</div>
                <div className="mode-card__desc">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Main Workspace ──────────────────────────────────────────────── */}
      <main className="workspace">
        
        {/* Input Panel */}
        <div className="panel">
          <div className="panel__header">
            <div className="panel__title">
              <PenTool size={16} /> Input Prompt
            </div>
            
            <div className="panel__actions">
              <button 
                className="enhance-btn"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || !prompt.trim()}
                title="Polish draft idea with AI prompt engineering"
              >
                <Wand2 size={13} className={isEnhancing ? 'spin' : ''} />
                <span>{isEnhancing ? 'Enhancing...' : 'Enhance Prompt'}</span>
              </button>

              <button 
                className="icon-btn" 
                onClick={savePrompt}
                title="Save prompt for later"
                disabled={!prompt.trim()}
              >
                <Bookmark size={14} />
              </button>

              <span className="panel__meta" style={{ marginLeft: '6px' }}>
                <span style={{ color: charCount > 4500 ? '#ef4444' : charCount > 3500 ? '#f59e0b' : 'inherit' }}>
                  {charCount.toLocaleString()}
                </span> / 5,000
              </span>
            </div>
          </div>
          
          <div className="input-area">
            <textarea
              className="input-area__textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={PLACEHOLDERS[mode]}
              maxLength={5000}
            />
          </div>
          
          {/* Extended Control Parameters */}
          <div className="controls">
            <div className="control-group">
              <label className="control-label">Tone</label>
              <select 
                className="control-select"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                <option value="professional">🎯 Professional</option>
                <option value="casual">😊 Casual</option>
                <option value="formal">🎩 Formal</option>
                <option value="witty">😄 Witty</option>
                <option value="persuasive">💪 Persuasive</option>
                <option value="empathetic">💙 Empathetic</option>
                <option value="urgent">⚡ Urgent</option>
              </select>
            </div>

            <div className="control-group">
              <label className="control-label">Audience</label>
              <select 
                className="control-select"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              >
                <option value="general">🌐 General</option>
                <option value="executive">🏢 Executives</option>
                <option value="technical">⚡ Tech / Devs</option>
                <option value="beginner">🌱 Beginners</option>
                <option value="genz">📱 Gen-Z / Social</option>
              </select>
            </div>

            <div className="control-group">
              <label className="control-label">Language</label>
              <select 
                className="control-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="english">🇺🇸 English</option>
                <option value="spanish">🇪🇸 Spanish</option>
                <option value="french">🇫🇷 French</option>
                <option value="german">🇩🇪 German</option>
                <option value="japanese">🇯🇵 Japanese</option>
                <option value="chinese">🇨🇳 Chinese</option>
                <option value="portuguese">🇵🇹 Portuguese</option>
                <option value="italian">🇮🇹 Italian</option>
                <option value="hindi">🇮🇳 Hindi</option>
              </select>
            </div>

            <div className="control-group">
              <label className="control-label">Length</label>
              <select
                className="control-select"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>

            <div className="control-group slider-group">
              <label className="control-label">Creativity ({creativity})</label>
              <input 
                type="range"
                min="0.2"
                max="1.0"
                step="0.1"
                value={creativity}
                onChange={(e) => setCreativity(parseFloat(e.target.value))}
                className="creativity-slider"
              />
            </div>

            <div className="controls__spacer"></div>
            
            <button 
              className={`btn-generate ${(isGenerating || isRefining) ? 'stop' : ''}`}
              onClick={handleGenerate}
            >
              {(isGenerating || isRefining) ? (
                <>
                  <Square size={16} className="btn-generate__icon" fill="currentColor" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play size={16} className="btn-generate__icon" fill="currentColor" />
                  <span>Generate</span>
                  <span className="btn-generate__shortcut">Ctrl+↵</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="panel">
          <div className="panel__header">
            <div className="panel__title">
              <Sparkles size={16} /> Output Content
            </div>
            
            {output && (
              <div className="panel__actions">
                <button 
                  className={`icon-btn ${isSpeaking ? 'active' : ''}`}
                  onClick={speakContent}
                  title={isSpeaking ? (isPaused ? 'Resume Audio' : 'Pause Audio') : 'Listen to Content'}
                >
                  {isSpeaking && !isPaused ? <Pause size={14} /> : <Volume2 size={14} />}
                </button>

                {isSpeaking && (
                  <button 
                    className="icon-btn"
                    onClick={stopSpeech}
                    title="Stop Audio"
                  >
                    <VolumeX size={14} />
                  </button>
                )}

                <button 
                  className={`icon-btn ${isRawMode ? 'active' : ''}`}
                  onClick={() => setIsRawMode(!isRawMode)}
                  title="Toggle raw text / formatted preview"
                >
                  <Settings2 size={14} />
                </button>
                
                <ExportMenu 
                  onExportText={exportAsText} 
                  onExportMarkdown={exportAsMarkdown}
                  onExportHTML={exportAsHTML}
                  onPrint={printDocument}
                />
                
                <button 
                  className="icon-btn"
                  onClick={copyToClipboard}
                  title="Copy to clipboard"
                  style={{ color: isCopied ? 'var(--accent-emerald)' : '', borderColor: isCopied ? 'var(--accent-emerald)' : '' }}
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>
          
          {/* Live Content Analytics Studio Bar */}
          {output && (
            <div className="analytics-bar">
              <div className="analytics-badge">
                <span className="analytics-badge__label">Words:</span>
                <span className="analytics-badge__val">{wordCount.toLocaleString()}</span>
              </div>

              <div className="analytics-badge">
                <span className="analytics-badge__label">Est. Read:</span>
                <span className="analytics-badge__val">{readingTimeMinutes} min</span>
              </div>

              <div className="analytics-badge" title={readability.desc}>
                <span className="analytics-badge__label">Readability:</span>
                <span className="analytics-badge__val" style={{ color: readability.color }}>
                  {readability.score}
                </span>
              </div>

              <div className="analytics-badge">
                <span className="analytics-badge__label">Chars:</span>
                <span className="analytics-badge__val">{outputCharCount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="output-area">
            {!output && !isGenerating && !isRefining ? (
              <div className="output-placeholder">
                <div className="output-placeholder__icon"><Sparkles size={48} /></div>
                <p className="output-placeholder__text">
                  Your generated content will stream in real time. Select tone, audience, and creativity settings to craft your ideal content.
                </p>
              </div>
            ) : (
              <div className={`output-content ${(isGenerating || isRefining) ? 'streaming' : ''} ${isRawMode ? 'raw' : ''}`}>
                {(isGenerating || isRefining) && !output ? (
                  <>
                    <div className="skeleton-line" style={{ width: '95%' }}></div>
                    <div className="skeleton-line" style={{ width: '80%' }}></div>
                    <div className="skeleton-line" style={{ width: '88%' }}></div>
                    <div className="skeleton-line" style={{ width: '60%' }}></div>
                  </>
                ) : isRawMode ? (
                  output
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {output}
                  </ReactMarkdown>
                )}
                <div ref={outputEndRef} />
              </div>
            )}
          </div>

          {/* 🪄 Post-Generation AI Magic Refinements Bar */}
          {output && !isGenerating && (
            <div className="magic-refine-bar">
              <span className="magic-refine-title">
                <Wand2 size={13} /> AI Magic Actions:
              </span>

              <button 
                className="refine-chip" 
                onClick={() => handleMagicRefine('concise')}
                disabled={isRefining}
              >
                ✂️ Make Concise
              </button>

              <button 
                className="refine-chip" 
                onClick={() => handleMagicRefine('expand')}
                disabled={isRefining}
              >
                📜 Expand Detail
              </button>

              <button 
                className="refine-chip" 
                onClick={() => handleMagicRefine('fix-grammar')}
                disabled={isRefining}
              >
                🛠️ Fix Grammar
              </button>

              <button 
                className="refine-chip" 
                onClick={() => handleMagicRefine('title-ideas')}
                disabled={isRefining}
              >
                💡 Title Ideas
              </button>

              <button 
                className="refine-chip" 
                onClick={() => handleMagicRefine('key-takeaways')}
                disabled={isRefining}
              >
                📌 Key Takeaways
              </button>
            </div>
          )}
        </div>
      </main>
      
      {/* ── Lower Section: History & Saved ──────────────────────────────── */}
      <div className="workspace" style={{ marginTop: '3rem' }}>
        
        {/* Recent History */}
        <div className="history">
          <div className="history__header">
            <div className="history__title">
              <Clock size={14} /> Recent Generations
            </div>
            {history.length > 0 && (
              <button className="btn-text" onClick={clearHistory}>Clear All</button>
            )}
          </div>
          
          <div className="history__list">
            {history.length === 0 ? (
              <div className="history-empty">No generations yet.</div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id} 
                  className="history-item"
                  onClick={() => loadHistoryItem(item)}
                >
                  <div className="history-item__mode">
                    {MODES.find(m => m.id === item.mode)?.icon && 
                     React.createElement(MODES.find(m => m.id === item.mode).icon, { size: 20 })}
                  </div>
                  <div className="history-item__content">
                    <div className="history-item__prompt">{item.prompt}</div>
                    <div className="history-item__meta">
                      {item.mode} • {item.tone} • {getTimeAgo(new Date(item.timestamp))}
                    </div>
                  </div>
                  <div className="history-item__actions">
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Saved Prompts */}
        <div className="history">
          <div className="history__header">
            <div className="history__title">
              <Bookmark size={14} /> Saved Prompts
            </div>
          </div>
          
          <div className="history__list">
            {savedPrompts.length === 0 ? (
              <div className="history-empty">Click the bookmark icon in the input panel to save prompts for later.</div>
            ) : (
              savedPrompts.map((item) => (
                <div 
                  key={item.id} 
                  className="saved-prompt-item"
                  onClick={() => {
                    setPrompt(item.prompt);
                    setMode(item.mode);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className="saved-prompt-item__text">{item.prompt}</div>
                  <div>
                    <div className="saved-prompt-item__mode">{item.mode}</div>
                  </div>
                  <button 
                    className="saved-prompt-item__delete"
                    onClick={(e) => deleteSavedPrompt(item.id, e)}
                    title="Delete saved prompt"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="footer">
        <p className="footer__text">
          Built with <span className="footer__heart">♥</span> React • Powered by Google Gemini
        </p>
      </footer>
      
      {/* ── Templates Modal ─────────────────────────────────────────────── */}
      {isTemplatesOpen && (
        <div className="modal-overlay" onClick={() => setIsTemplatesOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Template Library</h2>
              <button className="modal__close" onClick={() => setIsTemplatesOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal__body">
              {TEMPLATES.map((category, idx) => (
                <div key={idx} className="template-category">
                  <h3 className="template-category__title">
                    <span>{category.icon}</span> {category.category}
                  </h3>
                  <div className="template-grid">
                    {category.items.map((item, itemIdx) => (
                      <div 
                        key={itemIdx} 
                        className="template-card"
                        onClick={() => applyTemplate(item)}
                      >
                        <h4 className="template-card__title">{item.title}</h4>
                        <p className="template-card__desc">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Export Menu Component ──────────────────────────────────────────────────
import React from 'react';

function ExportMenu({ onExportText, onExportMarkdown, onExportHTML, onPrint }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button 
        className={`icon-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Download / Export options"
      >
        <Download size={14} />
      </button>
      
      {isOpen && (
        <div className="export-menu">
          <button className="export-menu__item" onClick={() => { onExportText(); setIsOpen(false); }}>
            <FileText size={14} /> Plain Text (.txt)
          </button>
          <button className="export-menu__item" onClick={() => { onExportMarkdown(); setIsOpen(false); }}>
            <FileDown size={14} /> Markdown (.md)
          </button>
          <button className="export-menu__item" onClick={() => { onExportHTML(); setIsOpen(false); }}>
            <FileCode size={14} /> Web Page (.html)
          </button>
          <button className="export-menu__item" onClick={() => { onPrint(); setIsOpen(false); }}>
            <Printer size={14} /> Print / PDF View
          </button>
        </div>
      )}
    </div>
  );
}

function BookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
    </svg>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
