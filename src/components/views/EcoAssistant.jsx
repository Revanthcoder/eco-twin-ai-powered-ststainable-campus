import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, AlertCircle, Loader, Leaf, RefreshCw, Volume2, VolumeX, Copy, Check } from 'lucide-react';
import campusApi from '../../services/api';

const SUGGESTED_PROMPTS = [
  'Which building uses the most energy?',
  'What is our current sustainability score?',
  'Is there an active water leak on campus?',
  'How can the cafeteria reduce water usage?',
  'What is the recycling rate this month?',
  'Show solar generation output',
  'What are the active campus alerts?'
];

function ChatMessage({ msg, onSpeak, speakingId, onCopy, copiedId }) {
  const isUser = msg.role === 'user';
  const isSpeaking = speakingId === msg.id;
  const isCopied = copiedId === msg.id;

  const rawText = msg.answer || msg.content || '';
  const cleanText = rawText.replace(/\*\*(.*?)\*\*/g, '$1');

  return (
    <div className={`chat-msg ${isUser ? 'user-msg' : 'bot-msg'}`}>
      <div className="chat-avatar">
        {isUser ? <User size={16} /> : <Bot size={16} className="text-emerald" />}
      </div>
      <div className="chat-bubble">
        {!isUser && msg.answer && (
          <p className="bubble-text" dangerouslySetInnerHTML={{ __html: msg.answer.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
        )}
        {isUser && <p className="bubble-text">{msg.content}</p>}

        {/* Citations */}
        {msg.citations && msg.citations.length > 0 && (
          <div className="chat-citations">
            <span className="cite-label">📎 Telemetry Citations:</span>
            {msg.citations.map((c, i) => <span key={i} className="cite-item">{c}</span>)}
          </div>
        )}

        {/* Uncertainty notice */}
        {msg.uncertaintyNotice && (
          <div className="chat-uncertainty">
            <AlertCircle size={12} />
            <span>{msg.uncertaintyNotice}</span>
          </div>
        )}

        {/* Confidence & Actions */}
        <div className="chat-bubble-footer">
          {msg.confidence && (
            <div className="chat-confidence">
              Confidence: <strong>{msg.confidence}</strong>
            </div>
          )}

          {!isUser && (
            <div className="chat-actions">
              <button
                className={`msg-action-btn ${isSpeaking ? 'active-speaking' : ''}`}
                onClick={() => onSpeak(msg.id, cleanText)}
                title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
              >
                {isSpeaking ? <VolumeX size={13} className="text-emerald" /> : <Volume2 size={13} />}
              </button>
              <button
                className="msg-action-btn"
                onClick={() => onCopy(msg.id, cleanText)}
                title="Copy response"
              >
                {isCopied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EcoAssistant() {
  const [messages, setMessages] = useState([
    {
      id: 0, role: 'assistant',
      answer: "Hi! I'm **EcoPulse Eco AI** 🌿 — I have direct access to live telemetry from edge IoT sensors across 5 facility nodes. Ask me anything about energy, water, waste, sustainability scores, active maintenance issues, or the Net Zero 2030 roadmap.",
      citations: ['Live Campus IoT Network', 'EcoTwin SQLite Telemetry Hub'],
      uncertaintyNotice: null,
      confidence: 'High (System Connected)'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Speech synthesis
  const handleSpeak = (id, text) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (text) => {
    const prompt = (text || input).trim();
    if (!prompt) return;

    const userMsg = { id: Date.now(), role: 'user', content: prompt };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await campusApi.askEcoAssistant(prompt);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        answer: res.answer,
        citations: res.citations,
        uncertaintyNotice: res.uncertaintyNotice,
        confidence: res.confidence
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant',
        answer: 'I encountered a connection issue. Please check the backend and try again.',
        citations: [], uncertaintyNotice: null, confidence: null
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClear = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeakingId(null);
    setMessages([{
      id: 0, role: 'assistant',
      answer: "Conversation cleared. How can I assist with campus sustainability and energy management today?",
      citations: [], uncertaintyNotice: null, confidence: null
    }]);
  };

  return (
    <div className="assistant-page animate-fade-in">
      <div className="assistant-header">
        <div className="assistant-brand">
          <div className="assistant-avatar-lg">
            <Leaf size={22} className="text-emerald" />
          </div>
          <div>
            <h2 className="page-title">Eco AI Assistant</h2>
            <p className="page-subtitle">Evidence-based sustainability advisor with live telemetry citations and read-aloud voice support</p>
          </div>
        </div>
        <button className="clear-chat-btn" onClick={handleClear} title="Clear conversation">
          <RefreshCw size={15} /> New Chat
        </button>
      </div>

      {/* Suggested prompts */}
      <div className="suggested-prompts">
        {SUGGESTED_PROMPTS.map((p, i) => (
          <button key={i} className="prompt-chip" onClick={() => handleSend(p)}>{p}</button>
        ))}
      </div>

      {/* Chat Window */}
      <div className="chat-window glass-panel">
        <div className="chat-scroll">
          {messages.map(msg => (
            <ChatMessage
              key={msg.id}
              msg={msg}
              onSpeak={handleSpeak}
              speakingId={speakingId}
              onCopy={handleCopy}
              copiedId={copiedId}
            />
          ))}

          {isTyping && (
            <div className="chat-msg bot-msg">
              <div className="chat-avatar"><Bot size={16} className="text-emerald" /></div>
              <div className="chat-bubble typing-bubble">
                <Loader size={14} className="spin-icon text-emerald" />
                <span>Consulting campus sensor nodes…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar">
          <input
            className="chat-input"
            type="text"
            placeholder="Ask about campus energy, water, alerts, solar generation, or sustainability targets…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            aria-label="Type your sustainability question"
            disabled={isTyping}
          />
          <button
            className="send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </div>

        <p className="chat-disclaimer">
          <AlertCircle size={11} /> EcoPulse AI provides evidence-based recommendations. Responses include sensor data citations and confidence levels. Always verify critical decisions with qualified engineers.
        </p>
      </div>
    </div>
  );
}
