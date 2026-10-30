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
  Film, 
  X, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  Play, 
  CheckCircle2,
  FileCheck,
  Send,
  RotateCcw,
  Bot,
  User,
  AlertTriangle
} from 'lucide-react';

interface VideoReviewInterfaceProps {
  projectName: string;
  projectId?: string;
  defaultVideoName?: string;
}

interface VideoChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export const VideoReviewInterface: React.FC<VideoReviewInterfaceProps> = ({
  projectName,
  projectId = 'default-project',
  defaultVideoName
}) => {
  const storageKey = `brandguard_chat_${projectId}_videos`;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [instructions, setInstructions] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  
  const [analysisResult, setAnalysisResult] = useState<{
    overallResult: string;
    keyFindings: string[];
    findings: AnalysisFinding[];
  } | null>(null);

  // Follow-up Chat state
  const [chatMessages, setChatMessages] = useState<VideoChatMessage[]>(() => {
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

  const supportedFormats = ['.mp4', '.webm', '.mov'];

  // Sync to localStorage
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
    getReviewHistory(projectId, 'videos').then(hist => {
      if (isMounted && hist.messages && hist.messages.length > 0) {
        const mapped: VideoChatMessage[] = hist.messages.map(m => ({
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
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!supportedFormats.includes(ext)) {
      setErrorNotice(`Unsupported video format: "${file.name}". Supported formats: MP4, WebM, MOV.`);
      return;
    }

    if (file.size > 250 * 1024 * 1024) {
      setErrorNotice('File size exceeds 250MB limit. Please upload a web-optimized cut.');
      return;
    }

    setErrorNotice(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    setAnalysisResult(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.style.borderColor = 'var(--color-signal-coral)';
      dropZoneRef.current.style.backgroundColor = 'var(--color-surface-subtle)';
    }
  };

  const handleDragLeave = () => {
    if (dropZoneRef.current) {
      dropZoneRef.current.style.borderColor = 'var(--color-border-gray)';
      dropZoneRef.current.style.backgroundColor = 'transparent';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragLeave();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setVideoPreviewUrl(null);
    setAnalysisResult(null);
    setErrorNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyse = async () => {
    if (!selectedFile && !videoPreviewUrl && !instructions.trim()) {
      setErrorNotice('Please select or upload a video file to proceed.');
      return;
    }

    setIsAnalyzing(true);
    setErrorNotice(null);
    setAnalysisStep('Submitting video asset to BrandGuard media ingestion pipeline...');

    const fileName = selectedFile?.name || defaultVideoName || 'video_spot.mp4';
    const contentDescription = `Video Asset: "${fileName}"\nDuration and track parameters submitted for legal broadcast review. Instructions: ${instructions || 'Verify super title duration, spoken audio terms disclaimers, and logo intro margins.'}`;

    try {
      let response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('project_id', projectId);
        formData.append('review_type', 'videos');
        formData.append('instructions', instructions || 'Analyze on-screen super title durations (min 4.0s required), spoken voiceover disclaimer compliance, and animated logo intro safety zones. Return timestamped findings.');
        formData.append('conversation_id', `${projectId}:videos`);

        setAnalysisStep('Performing multimodal & frame compliance audit with Gemini 2.5 Flash...');
        response = await uploadAndAnalyzeReview(formData);
      } else {
        response = await analyzeReview({
          project_id: projectId,
          review_type: 'videos',
          content: contentDescription,
          instructions: instructions || 'Analyze on-screen super title durations (min 4.0s required), spoken voiceover disclaimer compliance, and animated logo intro safety zones. Return timestamped findings.',
          file_name: fileName,
          conversation_id: `${projectId}:videos`
        });
      }

      setAnalysisResult({
        overallResult: response.overallResult,
        keyFindings: response.keyFindings,
        findings: response.findings
      });

      const initialNotice: VideoChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: response.summaryNarration || `Video governance audit completed for "${fileName}". Identified ${response.findings.length} timestamped findings. You can ask questions about timestamped corrections below.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, initialNotice]);

    } catch (err: any) {
      const msg = err.message || 'Video analysis failed to execute on backend.';
      setErrorNotice(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupInput.trim() || isSendingFollowup) return;

    const question = followupInput.trim();
    const userMsg: VideoChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setFollowupInput('');
    setIsSendingFollowup(true);

    const contextNotes = analysisResult 
      ? `Verdict: ${analysisResult.overallResult}\nFindings: ${analysisResult.findings.map(f => `[${f.timestamp || '00:00'}] ${f.title}: ${f.explanation}`).join('; ')}`
      : 'Video Broadcast and Legal Disclaimer Standards';

    try {
      const replyData = await sendChatFollowup({
        project_id: projectId,
        review_type: 'videos',
        message: question,
        conversation_id: `${projectId}:videos`,
        context_notes: contextNotes
      });

      const aiMsg: VideoChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: replyData.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: VideoChatMessage = {
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
    await clearReviewHistory(projectId, 'videos');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Upload & Video Preview Section */}
      <div 
        className="card-panel"
        style={{
          padding: '24px',
          backgroundColor: 'var(--color-surface-white)',
          border: '1px solid var(--color-border-gray)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong style={{ fontSize: '1.05rem', color: 'var(--color-deep-ink)', display: 'block' }}>
              Video Commercial & Motion Graphics Review
            </strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-slate)' }}>
              Connected to Google Gemini 2.5 Flash for timestamped analysis of super titles (min 4s), spoken voiceover disclaimers, and logo isolation.
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
              <span>Clear Video</span>
            </button>
          )}
        </div>

        {/* Video Upload Dropzone */}
        {!videoPreviewUrl ? (
          <div 
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--color-border-gray)',
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
              accept=".mp4,.webm,.mov"
              style={{ display: 'none' }} 
            />
            <div 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: 'var(--radius-full)', 
                backgroundColor: 'var(--color-surface-subtle)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--color-evidence-teal)'
              }}
            >
              <Film size={22} />
            </div>
            <div>
              <strong style={{ fontSize: '0.92rem', color: 'var(--color-deep-ink)', display: 'block' }}>
                Click to upload video footage or drag and drop
              </strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
                Supported formats: MP4, WebM, MOV (Max 250MB)
              </span>
            </div>
          </div>
        ) : (
          /* Live HTML5 Video Preview Player */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'center' }}>
            <div 
              style={{ 
                borderRadius: 'var(--radius-md)', 
                overflow: 'hidden', 
                border: '1px solid var(--color-border-gray)',
                backgroundColor: '#000000'
              }}
            >
              <video 
                src={videoPreviewUrl} 
                controls 
                style={{ width: '100%', maxHeight: '280px', display: 'block' }} 
              />
              <div 
                style={{ 
                  backgroundColor: 'var(--color-deep-ink)', 
                  color: '#FFFFFF', 
                  fontSize: '0.74rem', 
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>{selectedFile?.name || defaultVideoName || 'video_asset.mp4'}</span>
                <span>{((selectedFile?.size || 1024 * 1024 * 14) / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            </div>

            {/* Optional Instructions alongside video */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-deep-ink)' }}>
                Review Instructions / Broadcast Channel Targets:
              </label>
              <textarea 
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Verify lower-third disclaimer legibility and check end card audio disclaimer..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-gray)',
                  backgroundColor: 'var(--color-surface-subtle)',
                  fontSize: '0.85rem',
                  resize: 'none',
                  color: 'var(--color-deep-ink)'
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
                <span>{isAnalyzing ? 'Analyzing Video...' : 'Run Video Governance Review'}</span>
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
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
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
              backgroundColor: 'var(--color-surface-subtle)', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              border: '1px solid var(--color-border-subtle)'
            }}
          >
            <Clock size={18} color="var(--color-evidence-teal)" />
            <div>
              <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--color-deep-ink)' }}>Processing Video Footage...</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>{analysisStep}</span>
            </div>
          </div>
        )}
      </div>

      {/* Two-Column Analysis Results Layout */}
      {analysisResult && (
        <AnalysisResultsLayout 
          projectName={projectName}
          reviewType="videos"
          overallResult={analysisResult.overallResult}
          projectId={projectId}
          fileName={selectedFile?.name || defaultVideoName || 'Summer_Promotion_Teaser.mp4'}
          summaryNarration={`Video governance audit completed for "${selectedFile?.name || defaultVideoName || 'video asset'}". Identified ${analysisResult.findings.length} findings evaluated against on-screen duration thresholds, logo margins, and audio disclaimers.`}
          keyFindings={analysisResult.keyFindings}
          findings={analysisResult.findings}
        />
      )}

      {/* Follow-up Chat Section for Video Review */}
      {analysisResult && (
        <div 
          className="card-panel"
          style={{
            padding: '20px',
            backgroundColor: 'var(--color-surface-white)',
            border: '1px solid var(--color-border-gray)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={18} color="var(--color-evidence-teal)" />
              <strong style={{ fontSize: '0.94rem', color: 'var(--color-deep-ink)' }}>
                Ask Follow-Up Questions About Timestamped Findings
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
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-surface-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: msg.isError ? 'var(--color-error)' : 'var(--color-evidence-teal)', flexShrink: 0 }}>
                    {msg.isError ? <AlertTriangle size={14} /> : <Bot size={14} />}
                  </div>
                )}
                <div 
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: msg.sender === 'user' ? 'var(--color-deep-ink)' : 'var(--color-surface-subtle)',
                    color: msg.sender === 'user' ? '#FFFFFF' : 'var(--color-deep-ink)',
                    fontSize: '0.84rem',
                    lineHeight: 1.5,
                    border: msg.isError ? '1px solid var(--color-error)' : '1px solid var(--color-border-subtle)'
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
              placeholder="e.g. How can I adjust the 00:15 super banner to meet broadcast timing?"
              disabled={isSendingFollowup}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-gray)',
                backgroundColor: 'var(--color-surface-subtle)',
                fontSize: '0.84rem',
                color: 'var(--color-deep-ink)'
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
