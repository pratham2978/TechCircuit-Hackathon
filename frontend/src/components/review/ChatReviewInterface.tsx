import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResultsLayout } from './AnalysisResultsLayout';
import { AnalysisFinding } from '../../utils/pdfGenerator';
import { 
  analyzeReview, 
  uploadAndAnalyzeReview,
  sendChatFollowup, 
  clearReviewHistory,
  getReviewHistory 
} from '../../services/api';
import { 
  Paperclip, 
  Send, 
  X, 
  Sparkles, 
  FileText, 
  User, 
  Bot, 
  RotateCcw, 
  AlertCircle,
  Clock,
  ArrowDown,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  attachments?: Array<{ name: string; size: string; type: string }>;
  analysisResult?: {
    overallResult: string;
    keyFindings: string[];
    findings: AnalysisFinding[];
  };
  isError?: boolean;
}

interface ChatReviewInterfaceProps {
  toolType: 'legal' | 'promotions' | 'content';
  projectName: string;
  projectId?: string;
  defaultDocumentName?: string;
  initialContent?: string;
  initialFindings?: AnalysisFinding[];
  onApplyCorrection?: (findingId: string, correction: string) => void;
}

export const ChatReviewInterface: React.FC<ChatReviewInterfaceProps> = ({
  toolType,
  projectName,
  projectId = 'default-project',
  defaultDocumentName,
  initialContent,
  initialFindings,
  onApplyCorrection
}) => {
  const storageKey = `brandguard_chat_${projectId}_${toolType}`;

  const toolTitles = {
    legal: 'Legal Document Compliance Assistant',
    promotions: 'Promotion & Offer Claims Auditor',
    content: 'Brand Content & Manuscript Editor'
  };
  const toolDescriptions = {
    legal: 'Upload a contract or agreement, or enter clauses directly. I will analyze SLA limits, prohibited liability language, and required regulatory disclaimers.',
    promotions: 'Upload promotional copy or campaign announcements. I will cross-reference discount percentages and dates against the approved claim ledger.',
    content: 'Paste marketing copy or upload drafts. I will verify tone, voice consistency, terminology rules, and citation substantiations.'
  };

  const getWelcomeMessage = (): ChatMessage => ({
    id: 'msg-welcome',
    sender: 'assistant',
    timestamp: 'Just now',
    text: `Welcome to BrandGuard ${toolTitles[toolType]}. ${toolDescriptions[toolType]}`
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return [getWelcomeMessage()];
  });

  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // Storage quota or error
    }
  }, [messages, storageKey]);

  // Sync with backend history on mount or project switch
  useEffect(() => {
    let isMounted = true;
    getReviewHistory(projectId, toolType).then(hist => {
      if (isMounted && hist.messages && hist.messages.length > 0) {
        const mapped: ChatMessage[] = hist.messages.map(m => ({
          id: m.id,
          sender: m.role,
          timestamp: m.timestamp,
          text: m.text,
          attachments: m.attachments ? m.attachments.map(a => ({ name: a.name, size: a.size || 'Doc', type: a.type })) : undefined,
          analysisResult: m.analysisResult
        }));
        setMessages(mapped);
      }
    }).catch(() => {
      // Use local storage
    });

    return () => { isMounted = false; };
  }, [projectId, toolType]);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnalyzing]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const supportedExtensions = ['.docx', '.pdf', '.txt', '.html', '.md'];
      
      const validFiles: File[] = [];
      for (const f of filesArray) {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        if (supportedExtensions.includes(ext)) {
          validFiles.push(f);
        } else {
          setErrorNotice(`Unsupported file format: "${f.name}". Supported: .docx, .pdf, .txt, .html, .md`);
          setTimeout(() => setErrorNotice(null), 5000);
        }
      }

      setAttachedFiles(prev => [...prev, ...validFiles]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleResetConversation = async () => {
    setMessages([getWelcomeMessage()]);
    localStorage.removeItem(storageKey);
    await clearReviewHistory(projectId, toolType);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && attachedFiles.length === 0) return;

    const userText = inputText.trim();
    const currentAttachments = attachedFiles.map(f => ({
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      type: f.name.split('.').pop() || 'doc'
    }));

    // Add user message to conversation
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: userText,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setAttachedFiles([]);
    setIsAnalyzing(true);
    setErrorNotice(null);

    // Determine if this is a follow-up question or new review
    const hasPreviousAnalysis = messages.some(m => m.analysisResult);
    const isFollowup = hasPreviousAnalysis && currentAttachments.length === 0;

    if (isFollowup) {
      // Follow-up chat workflow
      setAnalysisStep('Connecting to AI backend and consulting review context...');
      
      // Build context summary from previous findings
      const prevAnalysis = messages.find(m => m.analysisResult)?.analysisResult;
      const contextNotes = prevAnalysis 
        ? `Verdict: ${prevAnalysis.overallResult}\nKey Findings: ${prevAnalysis.keyFindings.join('; ')}\nFindings Count: ${prevAnalysis.findings.length}`
        : initialContent || '';

      try {
        const chatRes = await sendChatFollowup({
          project_id: projectId,
          review_type: toolType,
          message: userText,
          conversation_id: `${projectId}:${toolType}`,
          context_notes: contextNotes
        });

        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: chatRes.reply
        };

        setMessages(prev => [...prev, aiMessage]);
      } catch (err: any) {
        const errorText = err.message || 'Failed to receive AI response from backend.';
        setErrorNotice(errorText);

        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `[Notice] **AI Service Notice**: ${errorText}`,
          isError: true
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    // Main Analysis Workflow
    try {
      let response;
      if (attachedFiles.length > 0) {
        setAnalysisStep('Uploading document and extracting structured text with page preservation...');
        const formData = new FormData();
        formData.append('file', attachedFiles[0]);
        formData.append('project_id', projectId);
        formData.append('review_type', toolType);
        formData.append('instructions', userText || '');
        formData.append('conversation_id', `${projectId}:${toolType}`);

        setAnalysisStep('Evaluating document content against BrandGuard Rule Index with Gemini 2.5 Flash...');
        response = await uploadAndAnalyzeReview(formData);
      } else {
        setAnalysisStep('Evaluating text against BrandGuard Rule Index & Claim Ledger with Gemini 2.5 Flash...');
        response = await analyzeReview({
          project_id: projectId,
          review_type: toolType,
          content: userText || initialContent || 'Review agreement clauses against brand and legal policies.',
          instructions: userText,
          file_name: defaultDocumentName,
          conversation_id: `${projectId}:${toolType}`
        });
      }

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.summaryNarration || `Analysis complete. Generated structured governance report with ${response.findings.length} findings.`,
        analysisResult: {
          overallResult: response.overallResult,
          keyFindings: response.keyFindings,
          findings: response.findings
        }
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      const errorText = err.message || 'Failed to connect to backend review service.';
      setErrorNotice(errorText);

      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `[Notice] **Analysis Could Not Complete**: ${errorText}`,
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 230px)', 
        minHeight: '600px',
        backgroundColor: 'var(--color-surface-white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border-gray)',
        overflow: 'hidden'
      }}
    >
      {/* Top Header Bar */}
      <div 
        style={{ 
          padding: '12px 20px', 
          borderBottom: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: 'var(--radius-full)', 
              backgroundColor: 'var(--color-evidence-teal-subtle)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--color-evidence-teal)'
            }}
          >
            <Bot size={18} />
          </div>
          <div>
            <strong style={{ fontSize: '0.92rem', color: 'var(--color-deep-ink)', display: 'block' }}>
              {toolTitles[toolType]}
            </strong>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)' }}>
              {projectName} • Connected to Google Gemini 2.5 Flash
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button" 
            onClick={handleResetConversation}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', fontSize: '0.74rem', gap: '4px' }}
            title="Clear and reset chat history for this review"
          >
            <RotateCcw size={12} />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorNotice && (
        <div 
          style={{ 
            padding: '10px 16px', 
            backgroundColor: 'rgba(230, 57, 70, 0.1)', 
            borderBottom: '1px solid var(--color-error)',
            color: 'var(--color-error)',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorNotice}</span>
          </div>
          <button 
            onClick={() => setErrorNotice(null)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Conversation Scrollable Area */}
      <div 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        {messages.map((msg) => (
          <div 
            key={msg.id}
            style={{ 
              display: 'flex', 
              gap: '12px',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: msg.sender === 'user' ? '75%' : '100%',
              width: msg.analysisResult ? '100%' : 'auto'
            }}
          >
            {msg.sender === 'assistant' && (
              <div 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: 'var(--radius-full)', 
                  backgroundColor: msg.isError ? 'var(--color-error-subtle)' : 'var(--color-surface-subtle)', 
                  border: `1px solid ${msg.isError ? 'var(--color-error)' : 'var(--color-border-subtle)'}`,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: msg.isError ? 'var(--color-error)' : 'var(--color-evidence-teal)',
                  flexShrink: 0
                }}
              >
                {msg.isError ? <AlertTriangle size={16} /> : <Bot size={16} />}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
              <div 
                style={{ 
                  padding: msg.analysisResult ? '12px 16px' : '12px 18px', 
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: msg.sender === 'user' 
                    ? 'var(--color-deep-ink)' 
                    : msg.isError
                    ? 'rgba(230, 57, 70, 0.08)'
                    : 'var(--color-surface-subtle)',
                  color: msg.sender === 'user' ? '#FFFFFF' : 'var(--color-deep-ink)',
                  fontSize: '0.88rem',
                  lineHeight: 1.55,
                  boxShadow: 'var(--shadow-sm)',
                  border: msg.isError ? '1px solid var(--color-error)' : '1px solid var(--color-border-subtle)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {/* User Attachment Badges */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: msg.text ? '8px' : '0' }}>
                    {msg.attachments.map((att, i) => (
                      <span 
                        key={i} 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: msg.sender === 'user' ? 'rgba(255, 255, 255, 0.15)' : 'var(--color-surface-white)',
                          fontSize: '0.74rem',
                          color: msg.sender === 'user' ? '#FFFFFF' : 'var(--color-deep-ink)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        <FileText size={12} />
                        <span>{att.name} ({att.size})</span>
                      </span>
                    ))}
                  </div>
                )}

                {msg.text && <div>{msg.text}</div>}
              </div>

              {/* Render Structured Two-Column Analysis Results Layout inside AI response */}
              {msg.analysisResult && (
                <AnalysisResultsLayout 
                  projectName={projectName}
                  reviewType={toolType}
                  overallResult={msg.analysisResult.overallResult}
                  projectId={projectId}
                  fileName={defaultDocumentName}
                  summaryNarration={msg.text}
                  reviewDate={msg.timestamp}
                  keyFindings={msg.analysisResult.keyFindings}
                  findings={msg.analysisResult.findings}
                  content={initialContent}
                  onApplyCorrection={onApplyCorrection}
                  onRequestFollowupChat={(prompt) => setInputText(prompt)}
                />
              )}

              <span 
                style={{ 
                  fontSize: '0.7rem', 
                  color: 'var(--color-muted-slate)', 
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  padding: '0 4px'
                }}
              >
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: 'var(--radius-full)', 
                  backgroundColor: 'var(--color-surface-subtle)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--color-deep-ink)',
                  flexShrink: 0
                }}
              >
                <User size={16} />
              </div>
            )}
          </div>
        ))}

        {/* Real-time Progress Step Indicator */}
        {isAnalyzing && (
          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
            <div 
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: 'var(--radius-full)', 
                backgroundColor: 'var(--color-surface-subtle)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--color-signal-coral)',
                flexShrink: 0
              }}
            >
              <Sparkles size={16} className="animate-spin" />
            </div>

            <div 
              style={{ 
                padding: '12px 18px', 
                borderRadius: 'var(--radius-lg)', 
                backgroundColor: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <Clock size={16} color="var(--color-signal-coral)" />
              <div>
                <strong style={{ fontSize: '0.84rem', display: 'block', color: 'var(--color-deep-ink)' }}>
                  BrandGuard AI Working...
                </strong>
                <span style={{ fontSize: '0.76rem', color: 'var(--color-muted-slate)' }}>
                  {analysisStep}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Bottom Input Area */}
      <div 
        style={{ 
          padding: '16px 20px', 
          borderTop: '1px solid var(--color-border-subtle)',
          backgroundColor: 'var(--color-surface-white)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* Attached Files Chips */}
        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingBottom: '4px' }}>
            {attachedFiles.map((file, idx) => (
              <span 
                key={idx}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '4px 10px', 
                  borderRadius: 'var(--radius-full)', 
                  backgroundColor: 'var(--color-surface-subtle)',
                  border: '1px solid var(--color-border-gray)',
                  fontSize: '0.75rem',
                  color: 'var(--color-deep-ink)'
                }}
              >
                <FileText size={13} color="var(--color-evidence-teal)" />
                <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                <button 
                  type="button" 
                  onClick={() => removeAttachment(idx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-slate)', padding: 0 }}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".docx,.pdf,.txt,.html,.md"
            multiple
            style={{ display: 'none' }}
          />

          {/* Attachment Button */}
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            title="Attach documents (.docx, .pdf, .txt, .html, .md)"
            style={{ 
              padding: '10px', 
              borderRadius: 'var(--radius-md)', 
              color: 'var(--color-muted-slate)' 
            }}
          >
            <Paperclip size={18} />
          </button>

          {/* Text Input Area */}
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              messages.some(m => m.analysisResult)
                ? "Ask a follow-up question or request clause rewrites..."
                : "Type instructions, attach a document, or enter clauses to review..."
            }
            disabled={isAnalyzing}
            style={{ 
              flex: 1, 
              padding: '12px 16px', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--color-border-gray)',
              backgroundColor: 'var(--color-surface-subtle)',
              fontSize: '0.88rem',
              color: 'var(--color-deep-ink)',
              outline: 'none'
            }}
          />

          {/* Send / Analyse Button */}
          <button 
            type="submit"
            disabled={isAnalyzing || (!inputText.trim() && attachedFiles.length === 0)}
            className="btn btn-primary"
            style={{ 
              padding: '12px 18px', 
              borderRadius: 'var(--radius-md)', 
              gap: '6px',
              opacity: isAnalyzing || (!inputText.trim() && attachedFiles.length === 0) ? 0.6 : 1,
              cursor: isAnalyzing || (!inputText.trim() && attachedFiles.length === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            <Send size={16} />
            <span>{messages.some(m => m.analysisResult) ? 'Send' : 'Analyse'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
