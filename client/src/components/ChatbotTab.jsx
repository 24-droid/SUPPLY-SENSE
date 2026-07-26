import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sparkles, MessageSquare, HelpCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function ChatbotTab() {
  const [messages, setMessages] = useState([
    {
      id: 'init',
      sender: 'bot',
      text: 'Hello! I am SupplyAI, your logistics and inventory optimization advisor. Ask me questions about inventory, demand forecasting, stock levels, or shipment delays!'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [typing, setTyping] = useState(false);
  const chatHistoryRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const handleSendMessage = (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    // Add user message
    const userMsgId = Date.now().toString();
    const newMessages = [
      ...messages,
      { id: userMsgId, sender: 'user', text }
    ];
    setMessages(newMessages);
    if (!textToSend) setInputText('');
    setTyping(true);

    // Call chatbot API
    fetch(`${API_BASE}/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    })
      .then(res => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
      })
      .then(data => {
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString(), sender: 'bot', text: data.reply }
        ]);
        setTyping(false);
      })
      .catch(err => {
        console.error(err);
        setMessages(prev => [
          ...prev,
          { id: Date.now().toString(), sender: 'bot', text: "I'm sorry, I encountered an issue connecting to my core brain. Please check that the backend server is running." }
        ]);
        setTyping(false);
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const presetPrompts = [
    "What items are out of stock?",
    "Show delayed shipments",
    "How is demand forecast calculated?",
    "How does EOQ optimize stock?"
  ];

  return (
    <div className="fade-in-up" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <h2 className="page-title">SupplyAI Assistant</h2>
          <p className="page-subtitle">Interact with our predictive recommendation engine using natural language.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', flexGrow: 1, minHeight: 0 }}>
        {/* Chat Area */}
        <div className="glass-panel chat-window" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', maxWidth: 'none', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'rgba(0, 242, 254, 0.02)' }}>
            <div className="logo-icon" style={{ width: 28, height: 28, borderRadius: '6px' }}>
              <Sparkles size={14} color="#000" />
            </div>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700 }}>SupplyAI Core</h3>
              <span style={{ fontSize: '11px', color: 'var(--color-emerald)' }}>● Agent Online</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="chat-history" ref={chatHistoryRef} style={{ flexGrow: 1, overflowY: 'auto' }}>
            {messages.map(m => (
              <div 
                key={m.id} 
                className={`chat-message ${m.sender}`}
                style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  alignItems: 'flex-start',
                  whiteSpace: 'pre-line' 
                }}
              >
                {m.sender === 'bot' ? (
                  <Bot size={16} color="var(--color-cyan)" style={{ marginTop: '3px', flexShrink: 0 }} />
                ) : (
                  <User size={16} color="var(--color-violet)" style={{ marginTop: '3px', flexShrink: 0 }} />
                )}
                <div>{m.text}</div>
              </div>
            ))}
            
            {typing && (
              <div className="chat-message bot" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Bot size={16} color="var(--color-cyan)" />
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Analyzing logistics database...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="chat-input-area">
            <input 
              type="text" 
              className="chat-input"
              placeholder="Ask SupplyAI e.g., 'What products are out of stock?'"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="chat-send-btn" onClick={() => handleSendMessage()}>
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Right Help Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-cyan)' }}>
              <HelpCircle size={16} /> Suggested Queries
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {presetPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(p)}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    textAlign: 'left',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = 'var(--color-cyan)';
                    e.currentTarget.style.background = 'rgba(0, 242, 254, 0.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', background: 'rgba(139, 92, 246, 0.02)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <MessageSquare size={14} color="var(--color-violet)" /> NLP Parser Details
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              SupplyAI parses user sentences for key verbs and nouns related to supply chain operations. It queries MongoDB collections to return direct status numbers and recommendations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
