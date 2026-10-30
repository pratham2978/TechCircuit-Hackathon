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
  ArrowDown
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
    legal: 'Legal document compliance assistant',
    promotions: 'Promotion and offer claims auditor',
    content: 'Brand content and manuscript editor'
  };
  const toolDescriptions = {
    legal: 'Upload a contract or agreement, or enter clauses directly. I will analyze SLA limits, prohibited liability language, and required regulatory disclaimers.',
    promotions: 'Upload promotional copy or campaign announcements. I will cross-reference discount percentages and dates against the approved claims ledger.',
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
          analysisResult: m.findings ? {
            overallResult: m.overallResult || 'Pass with recommendations',
            keyFindings: m.keyFindings || [],
            findings: m.findings
          } : undefined
        }));
        setMessages(mapped);
      }
    }).catch(() => {
      // Offline fallback
    });

    return () => {
      isMounted = false;
    };
  }, [projectId, toolType]);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnalyzing]);

  const handleClearHistory = async () => {
    if (window.confirm('Reset this review session? All messages and analysis logs for this tab will be cleared.')) {
      try {
        await clearReviewHistory(projectId, toolType);
      } catch {
        // Fallback
      }
      const resetMsgs = [getWelcomeMessage()];
      setMessages(resetMsgs);
      localStorage.removeItem(storageKey);
      setErrorNotice(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && attachedFiles.length === 0) return;

    setErrorNotice(null);

    const userMessageId = `usr-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newAttachments = attachedFiles.map(f => ({
      name: f.name,
      size: formatFileSize(f.size),
      type: f.type || 'document'
    }));

    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      timestamp,
      text: inputText.trim(),
      attachments: newAttachments.length > 0 ? newAttachments : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInputText = inputText.trim();
    const currentFiles = [...attachedFiles];

    setInputText('');
    setAttachedFiles([]);
    setIsAnalyzing(true);

    const hasAttachment = currentFiles.length > 0;
    const isInitialUpload = hasAttachment || (!messages.some(m => m.analysisResult) && currentInputText.length > 50);

    try {
      if (isInitialUpload) {
        setAnalysisStep('Uploading document to BrandGuard audit ledger...');
        await new Promise(r => setTimeout(r, 400));

        setAnalysisStep('Querying verified claims and governance rules (RAG)...');
        await new Promise(r => setTimeout(r, 500));

        setAnalysisStep('Executing multi-clause compliance checks via Gemini...');

        let result;
        if (hasAttachment) {
          const formData = new FormData();
          formData.append('file', currentFiles[0]);
          formData.append('project_id', projectId);
          formData.append('review_type', toolType);
          if (currentInputText) {
            formData.append('instructions', currentInputText);
          }
          result = await uploadAndAnalyzeReview(formData);
        } else {
          result = await analyzeReview({
            project_id: projectId,
            review_type: toolType,
            content: currentInputText,
            instructions: 'Analyze text submitted in project session'
          });
        }

        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: result.summaryNarration || `Analysis complete for ${toolTitles[toolType]}. Review findings and recommendations below.`,
          analysisResult: {
            overallResult: result.overallResult,
            keyFindings: result.keyFindings,
            findings: result.findings
          }
        };

        setMessages(prev => [...prev, assistantMsg]);
      } else {
        setAnalysisStep('Processing follow-up instruction against active findings...');

        const followupRes = await sendChatFollowup({
          projectId,
          toolType,
          message: currentInputText
        });

        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: followupRes.reply
        };

        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'The review engine encountered an error while processing your request.';
      setErrorNotice(errMsg);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  return (
    <div className="chat-container" style={{ height: '720px', display: 'flex', flexDirection: 'column' }}>

      {/* Chat Header */}
      <div 
        style={{ 
          padding: '12px 20px', 
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--success)'
            }} 
          />
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {toolTitles[toolType]}
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Active project: {projectName}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={handleClearHistory}
            className="btn btn-secondary btn-sm"
            title="Reset conversation"
          >
            <RotateCcw size={13} strokeWidth={1.5} />
            <span>Reset session</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner: ONE single inline alert */}
      {errorNotice && (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
          <div className="alert-inline-error">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              <span>{errorNotice}</span>
            </div>
            <button 
              onClick={() => setErrorNotice(null)} 
              style={{ color: 'inherit', padding: '2px' }}
              aria-label="Dismiss error notification"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
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
          gap: '16px'
        }}
        className="chat-messages-scroll"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id}
            style={{ 
              display: 'flex', 
              gap: '12px',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: msg.sender === 'user' ? '80%' : '100%',
              width: msg.analysisResult ? '100%' : 'auto'
            }}
          >
            {msg.sender === 'assistant' && (
              <div 
                style={{ 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: 'var(--radius)', 
                  backgroundColor: 'var(--surface-hover)', 
                  border: '1px solid var(--border)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  flexShrink: 0
                }}
              >
                <Bot size={15} strokeWidth={1.5} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              <div 
                className={msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {/* User Attachment Chips */}
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
                          backgroundColor: 'var(--surface)',
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <FileText size={12} strokeWidth={1.5} />
                        <span>{att.name}</span>
                        <span className="tabular" style={{ color: 'var(--text-muted)' }}>({att.size})</span>
                      </span>
                    ))}
                  </div>
                )}

                {msg.text && <div>{msg.text}</div>}
              </div>

              {/* Structured Two-Column Analysis Results Layout */}
              {msg.analysisResult && (
                <div style={{ marginTop: '8px' }}>
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
                </div>
              )}

              <span 
                className="tabular"
                style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-muted)', 
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  padding: '2px 4px'
                }}
              >
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div 
                style={{ 
                  width: '30px', 
                  height: '30px', 
                  borderRadius: 'var(--radius)', 
                  backgroundColor: 'var(--surface-hover)', 
                  border: '1px solid var(--border)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  flexShrink: 0
                }}
              >
                <User size={15} strokeWidth={1.5} />
              </div>
            )}
          </div>
        ))}

        {/* Real-time Progress Step Indicator */}
        {isAnalyzing && (
          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
            <div 
              style={{ 
                width: '30px', 
                height: '30px', 
                borderRadius: 'var(--radius)', 
                backgroundColor: 'var(--surface-hover)', 
                border: '1px solid var(--border)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--primary)',
                flexShrink: 0
              }}
            >
              <Sparkles size={15} strokeWidth={1.5} />
            </div>

            <div 
              style={{ 
                padding: '10px 16px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px'
              }}
            >
              <Clock size={15} strokeWidth={1.5} color="var(--primary)" />
              <div>
                <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>
                  BrandGuard AI reviewing...
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {analysisStep}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Fixed Bottom Input Area */}
      <div 
        style={{ 
          padding: '14px 20px', 
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0
        }}
      >
        {/* Attached Files Chips */}
        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingBottom: '2px' }}>
            {attachedFiles.map((file, idx) => (
              <span 
                key={idx}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '3px 8px', 
                  borderRadius: 'var(--radius-sm)', 
                  backgroundColor: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}
              >
                <FileText size={12} strokeWidth={1.5} />
                <span>{file.name}</span>
                <span className="tabular" style={{ color: 'var(--text-muted)' }}>({formatFileSize(file.size)})</span>
                <button 
                  onClick={() => removeAttachment(idx)}
                  style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                  aria-label="Remove attachment"
                >
                  <X size={12} strokeWidth={1.5} />
                </button>
              </span>
            ))}
          </div>
        )}

        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            style={{ display: 'none' }}
            multiple
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary btn-sm"
            style={{ height: '36px', padding: '0 10px' }}
            title="Attach file for compliance audit"
          >
            <Paperclip size={14} strokeWidth={1.5} />
          </button>

          <input 
            type="text" 
            className="form-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Ask a compliance question, request a citation check, or paste ${toolType} text...`}
            disabled={isAnalyzing}
            style={{ flex: 1 }}
          />

          <button 
            type="submit" 
            className="btn btn-primary btn-sm"
            disabled={isAnalyzing || (!inputText.trim() && attachedFiles.length === 0)}
            style={{ height: '36px', padding: '0 14px', gap: '6px' }}
          >
            <Send size={14} strokeWidth={1.5} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
