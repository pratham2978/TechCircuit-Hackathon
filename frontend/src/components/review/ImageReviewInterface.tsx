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
  Upload, 
  Image as ImageIcon, 
  X, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Send, 
  RotateCcw, 
  Bot, 
  User, 
  HelpCircle,
  AlertTriangle 
} from 'lucide-react';

interface ImageReviewInterfaceProps {
  projectName: string;
  projectId?: string;
  defaultImageName?: string;
}

interface ImageChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export const ImageReviewInterface: React.FC<ImageReviewInterfaceProps> = ({
  projectName,
  projectId = 'default-project',
  defaultImageName
}) => {
  const storageKey = `brandguard_chat_${projectId}_images`;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [instructions, setInstructions] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Analysis Result
  const [analysisResult, setAnalysisResult] = useState<{
    overallResult: string;
    keyFindings: string[];
    findings: AnalysisFinding[];
  } | null>(null);

  // Follow-up Chat state
  const [chatMessages, setChatMessages] = useState<ImageChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });
  const [followupInput, setFollowupInput] = useState('');
  const [isSendingFollowup, setIsSendingFollowup] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sync chat messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(chatMessages));
    } catch {
      // Ignore
    }
  }, [chatMessages, storageKey]);

  // Sync history on project change
  useEffect(() => {
    let isMounted = true;
    getReviewHistory(projectId, 'images').then(hist => {
      if (isMounted && hist.messages && hist.messages.length > 0) {
        const mapped: ImageChatMessage[] = hist.messages.map(m => ({
          id: m.id,
          sender: m.role,
          text: m.text,
          timestamp: m.timestamp
        }));
        setChatMessages(mapped);
      }
    }).catch(() => {
      // Use local
    });

    return () => { isMounted = false; };
  }, [projectId]);

  const handleFile = (file: File) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setErrorNotice(`Unsupported image format: "${file.name}". Please upload PNG, JPG, WEBP, or SVG.`);
      return;
    }

    setSelectedFile(file);
    setErrorNotice(null);
    setAnalysisResult(null);

    // Create object URL for preview
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);

    // Read base64 payload for Gemini multimodal inspection
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Strip 'data:image/...;base64,' prefix
      const commaIdx = base64String.indexOf(',');
      if (commaIdx !== -1) {
        setImageBase64(base64String.slice(commaIdx + 1));
      } else {
        setImageBase64(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.style.borderColor = 'var(--primary)';
      dropZoneRef.current.style.backgroundColor = 'var(--surface-subtle)';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.style.borderColor = 'var(--border)';
      dropZoneRef.current.style.backgroundColor = 'transparent';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.style.borderColor = 'var(--border)';
      dropZoneRef.current.style.backgroundColor = 'transparent';
    }
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setImageBase64(null);
    setImagePreviewUrl(null);
    setAnalysisResult(null);
    setErrorNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyse = async () => {
    if (!selectedFile && !imagePreviewUrl && !instructions.trim()) {
      setErrorNotice('Please upload an image or enter design instructions before requesting review.');
      return;
    }

    setIsAnalyzing(true);
    setErrorNotice(null);
    setAnalysisStep('Uploading image to BrandGuard Gemini 2.5 Flash Vision engine...');

    try {
      let response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('project_id', projectId);
        formData.append('review_type', 'images');
        formData.append('instructions', instructions || 'Analyze brand color tokens, WCAG 2.1 AA contrast ratio, logo isolation margins, typography, layout consistency, and required disclaimers.');
        formData.append('conversation_id', `${projectId}:images`);
        response = await uploadAndAnalyzeReview(formData);
      } else {
        response = await analyzeReview({
          project_id: projectId,
          review_type: 'images',
          content: `Image design review of "${defaultImageName || 'Visual Graphic'}" against BrandGuard color tokens, WCAG 2.1 AA 4.5:1 contrast, and logo safety zone.`,
          instructions: instructions || 'Analyze brand color tokens, WCAG 2.1 AA contrast ratio, logo isolation margins, and visible claim substantiations.',
          file_name: defaultImageName || 'banner_graphic.png',
          media_data: imageBase64 || undefined,
          media_mime_type: 'image/png',
          conversation_id: `${projectId}:images`
        });
      }

      setAnalysisResult({
        overallResult: response.overallResult,
        keyFindings: response.keyFindings,
        findings: response.findings
      });

      // Add audit announcement in chat history
      const initialNotice: ImageChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: `Design inspection completed for "${selectedFile?.name || defaultImageName || 'asset'}". Found ${response.findings.length} findings. You can now ask questions about fixing these visual violations.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, initialNotice]);

    } catch (err: any) {
      const msg = err.message || 'Image analysis failed to execute on backend.';
      setErrorNotice(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupInput.trim() || isSendingFollowup) return;

    const question = followupInput.trim();
    const userMsg: ImageChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setFollowupInput('');
    setIsSendingFollowup(true);

    const contextNotes = analysisResult 
      ? `Verdict: ${analysisResult.overallResult}\nFindings: ${analysisResult.findings.map(f => `${f.title}: ${f.explanation}`).join('; ')}`
      : 'Visual Design and Color Token Guidelines';

    try {
      const replyData = await sendChatFollowup({
        project_id: projectId,
        review_type: 'images',
        message: question,
        conversation_id: `${projectId}:images`,
        context_notes: contextNotes
      });

      const aiMsg: ImageChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: replyData.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ImageChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **AI Service Notice**: ${err.message || 'Failed to process follow-up.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSendingFollowup(false);
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResetChat = async () => {
    setChatMessages([]);
    localStorage.removeItem(storageKey);
    await clearReviewHistory(projectId, 'images');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Upload & Instructions Section */}
      <div 
        className="card-panel"
        style={{
          padding: '24px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block' }}>
              Image & Visual Media Review
            </strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Connected to Google Gemini 2.5 Flash Vision for palette token validation, WCAG 4.5:1 contrast, and logo clear-space.
            </span>
          </div>

          {selectedFile && (
            <button 
              type="button" 
              onClick={handleClear} 
              className="btn btn-secondary btn-sm"
              style={{ gap: '4px' }}
            >
              <X size={13} />
              <span>Clear Image</span>
            </button>
          )}
        </div>

        {/* Drag and Drop Upload Zone */}
        {!imagePreviewUrl ? (
          <div 
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
              }}
              accept=".png,.jpg,.jpeg,.webp,.svg"
              style={{ display: 'none' }} 
            />
            <div 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: 'var(--radius-full)', 
                backgroundColor: 'var(--surface-subtle)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--primary)'
              }}
            >
              <Upload size={22} />
            </div>
            <div>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                Click to upload design asset or drag and drop
              </strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Supported formats: PNG, JPG, JPEG, WEBP, SVG (Max 25MB)
              </span>
            </div>
          </div>
        ) : (
          /* Live Image Preview + Instructions */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'center' }}>
            <div 
              style={{ 
                position: 'relative', 
                borderRadius: 'var(--radius-md)', 
                overflow: 'hidden', 
                border: '1px solid var(--border)',
                maxHeight: '260px',
                backgroundColor: 'var(--surface-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img 
                src={imagePreviewUrl} 
                alt="Upload preview" 
                style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain' }} 
              />
              <div 
                style={{ 
                  position: 'absolute', 
                  bottom: '8px', 
                  left: '8px', 
                  backgroundColor: 'rgba(20, 33, 43, 0.85)', 
                  color: '#FFFFFF', 
                  fontSize: '0.72rem', 
                  padding: '3px 8px', 
                  borderRadius: 'var(--radius-sm)' 
                }}
              >
                {selectedFile?.name || defaultImageName || 'image_asset.png'} ({((selectedFile?.size || 1024 * 1024) / 1024 / 1024).toFixed(2)} MB)
              </div>
            </div>

            {/* Instructions & Analyse Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Optional Instructions / Brand Context:
              </label>
              <textarea 
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Focus on header logo placement and WCAG contrast for button labels..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-subtle)',
                  fontSize: '0.85rem',
                  resize: 'none',
                  color: 'var(--text-primary)'
                }}
              />
              <button 
                type="button"
                onClick={handleAnalyse}
                disabled={isAnalyzing}
                className="btn btn-primary"
                style={{ 
                  justifyContent: 'center', 
                  padding: '10px', 
                  gap: '6px',
                  opacity: isAnalyzing ? 0.7 : 1,
                  cursor: isAnalyzing ? 'not-allowed' : 'pointer'
                }}
              >
                <Sparkles size={16} />
                <span>{isAnalyzing ? 'Analyzing with Gemini Vision...' : 'Analyse Design Asset'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Error notification banner */}
        {errorNotice && (
          <div 
            style={{ 
              padding: '10px 14px', 
              backgroundColor: 'rgba(230, 57, 70, 0.1)', 
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
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
            <button onClick={() => setErrorNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Progress Step */}
        {isAnalyzing && (
          <div 
            style={{ 
              padding: '14px', 
              backgroundColor: 'var(--surface-subtle)', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              border: '1px solid var(--border)'
            }}
          >
            <Clock size={18} color="var(--primary)" />
            <div>
              <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--text-primary)' }}>Processing Design Asset...</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{analysisStep}</span>
            </div>
          </div>
        )}
      </div>

      {/* Two-Column Analysis Results Layout */}
      {analysisResult && (
        <AnalysisResultsLayout 
          projectName={projectName}
          reviewType="images"
          overallResult={analysisResult.overallResult}
          projectId={projectId}
          fileName={selectedFile?.name || defaultImageName || 'Campaign_Hero_Banner.png'}
          summaryNarration={`Design inspection complete for ${selectedFile?.name || defaultImageName || 'visual asset'}. Evaluated WCAG contrast ratios, brand color tokens, typography, and logo placement margins.`}
          keyFindings={analysisResult.keyFindings}
          findings={analysisResult.findings}
        />
      )}

      {/* Follow-up Chat Section for Image Review */}
      {analysisResult && (
        <div 
          className="card-panel"
          style={{
            padding: '20px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} color="var(--info)" />
              <strong style={{ fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                Ask Follow-Up Questions About This Design
              </strong>
            </div>
            <button 
              onClick={handleResetChat}
              className="btn btn-secondary btn-sm"
              style={{ padding: '3px 8px', fontSize: '0.72rem', gap: '4px' }}
            >
              <RotateCcw size={11} />
              <span>Clear Chat</span>
            </button>
          </div>

          {/* Chat Messages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
            {chatMessages.map(msg => (
              <div 
                key={msg.id}
                style={{ 
                  display: 'flex', 
                  gap: '10px',
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                {msg.sender === 'assistant' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--surface-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: msg.isError ? 'var(--danger)' : 'var(--info)', flexShrink: 0 }}>
                    {msg.isError ? <AlertTriangle size={14} /> : <Bot size={14} />}
                  </div>
                )}
                <div 
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: msg.sender === 'user' ? 'var(--text-primary)' : 'var(--surface-subtle)',
                    color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    border: msg.isError ? '1px solid var(--danger)' : '1px solid var(--border)'
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Follow-up Question Input Form */}
          <form onSubmit={handleSendFollowup} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text"
              value={followupInput}
              onChange={(e) => setFollowupInput(e.target.value)}
              placeholder="e.g. Which replacement hex color provides AAA contrast on this card?"
              disabled={isSendingFollowup}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface-subtle)',
                fontSize: '0.84rem',
                color: 'var(--text-primary)'
              }}
            />
            <button 
              type="submit"
              disabled={isSendingFollowup || !followupInput.trim()}
              className="btn btn-primary btn-sm"
              style={{ padding: '0 16px', gap: '6px' }}
            >
              <Send size={14} />
              <span>{isSendingFollowup ? 'Thinking...' : 'Ask AI'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
