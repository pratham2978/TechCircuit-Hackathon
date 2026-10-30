import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Volume2, VolumeX, X, ArrowRight, Check, Sparkles, Gamepad2 } from 'lucide-react';

export interface TourStep {
  selector: string;
  title: string;
  sentence: string;
  speechText: string;
  placement?: 'bottom' | 'top' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="account-switcher"]',
    title: 'Account Mode Switcher',
    sentence: 'Toggle between Client Workspace and Operations Reviewer modes to test both sides of the platform.',
    speechText: 'Toggle between Client Workspace and Operations Reviewer modes to test both sides of the platform.',
    placement: 'bottom'
  },
  {
    selector: '[data-tour="create-project-btn"]',
    title: 'New Campaign Project',
    sentence: 'Click here to initialize a new campaign review package with automated brand guardrails.',
    speechText: 'Click here to initialize a new campaign review package with automated brand guardrails.',
    placement: 'bottom'
  },
  {
    selector: '[data-tour="metrics-panel"]',
    title: 'Live Governance Metrics',
    sentence: 'Track active reviews, approvals, policy flags, and items awaiting verification in real time.',
    speechText: 'Track active reviews, approvals, policy flags, and items awaiting verification in real time.',
    placement: 'bottom'
  },
  {
    selector: '[data-tour="projects-table"]',
    title: 'Active Review Studios',
    sentence: 'Launch directly into multi-channel copy, legal briefs, image, or video review studios.',
    speechText: 'Launch directly into multi-channel copy, legal briefs, image, or video review studios.',
    placement: 'top'
  },
  {
    selector: '[data-tour="guidelines-card"]',
    title: 'Guidelines & Claim Ledger',
    sentence: 'Manage certified marketing claims, brand color tokens, and approved compliance rules.',
    speechText: 'Manage certified marketing claims, brand color tokens, and approved compliance rules.',
    placement: 'top'
  },
  {
    selector: '[data-tour="sidebar-nav"]',
    title: 'Command Navigation',
    sentence: 'Navigate across Change Requests, Brand Passports, History Reports, and Workspace Settings.',
    speechText: 'Navigate across Change Requests, Brand Passports, History Reports, and Workspace Settings.',
    placement: 'right'
  }
];

export const MascotGuidedTour: React.FC = () => {
  const [active, setActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize SpeechSynthesis reference
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Play retro game synth chime
  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, []);

  // Speak text with Mascot Voice
  const speakStep = useCallback((text: string) => {
    if (!synthRef.current || isAudioMuted) return;

    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.15; // Slightly upbeat friendly robot tone

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  }, [isAudioMuted]);

  // Stop current audio narration
  const handleStopAudio = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setIsAudioMuted(true);
    }
  };

  // Resume / toggle audio
  const handleToggleAudio = () => {
    if (isAudioMuted) {
      setIsAudioMuted(false);
      const currentStep = TOUR_STEPS[currentStepIndex];
      if (currentStep) {
        speakStep(currentStep.speechText);
      }
    } else {
      handleStopAudio();
    }
  };

  // Measure and scroll target element
  const updateHighlight = useCallback((index: number) => {
    const step = TOUR_STEPS[index];
    if (!step) return;

    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Small delay to allow smooth scrolling to settle before measuring
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 250);
    } else {
      setTargetRect(null);
    }
  }, []);

  // Start Tour
  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setActive(true);
    setIsAudioMuted(false);
    playChime();
    setTimeout(() => {
      updateHighlight(0);
      const firstStep = TOUR_STEPS[0];
      if (firstStep) speakStep(firstStep.speechText);
    }, 300);
  }, [playChime, speakStep, updateHighlight]);

  // Stop & Dismiss Tour
  const dismissTour = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setActive(false);
    setTargetRect(null);
    setIsSpeaking(false);

    // Clean up query param if present
    const params = new URLSearchParams(location.search);
    if (params.get('tour')) {
      params.delete('tour');
      const newSearch = params.toString() ? `?${params.toString()}` : '';
      navigate(`${location.pathname}${newSearch}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  // Next step
  const handleNext = () => {
    playChime();
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      updateHighlight(nextIdx);
      speakStep(TOUR_STEPS[nextIdx].speechText);
    } else {
      dismissTour();
    }
  };

  // OK / Got it button (acts as confirm & next, or finish)
  const handleOk = () => {
    handleNext();
  };

  // Listen for custom trigger event or URL ?tour=true or session flag
  useEffect(() => {
    const handleStartEvent = () => startTour();
    window.addEventListener('start-brandguard-tour', handleStartEvent);

    const params = new URLSearchParams(location.search);
    const hasTourParam = params.get('tour') === 'true';
    let hasTourSession = false;
    try {
      hasTourSession = sessionStorage.getItem('brandguard_start_tour') === 'true';
      if (hasTourSession) {
        sessionStorage.removeItem('brandguard_start_tour');
      }
    } catch {}

    if (hasTourParam || hasTourSession) {
      startTour();
    }

    return () => {
      window.removeEventListener('start-brandguard-tour', handleStartEvent);
    };
  }, [location.search, startTour]);

  // Re-measure on window resize or scroll
  useEffect(() => {
    if (!active) return;

    const handleReposition = () => {
      const step = TOUR_STEPS[currentStepIndex];
      if (!step) return;
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, { passive: true });

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition);
    };
  }, [active, currentStepIndex]);

  if (!active || !targetRect) return null;

  const step = TOUR_STEPS[currentStepIndex];
  if (!step) return null;

  // Calculate Tooltip position with boundary protection
  const PADDING = 10;
  const cardWidth = Math.min(380, window.innerWidth - 32);
  let top = targetRect.bottom + 14;
  let left = Math.max(16, targetRect.left + (targetRect.width / 2) - (cardWidth / 2));

  // If overflow bottom, show above target
  if (top + 220 > window.innerHeight && targetRect.top > 240) {
    top = targetRect.top - 230;
  }
  // Ensure left is within screen bounds
  if (left + cardWidth > window.innerWidth - 16) {
    left = window.innerWidth - cardWidth - 16;
  }

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        pointerEvents: 'none'
      }}
      aria-label="BrandGuard Game Guided Tutorial"
    >
      {/* Dimmed backdrop with precise lime-green spotlight cutout */}
      <div
        style={{
          position: 'fixed',
          left: targetRect.left - PADDING,
          top: targetRect.top - PADDING,
          width: targetRect.width + PADDING * 2,
          height: targetRect.height + PADDING * 2,
          borderRadius: '12px',
          boxShadow: '0 0 0 9999px rgba(9, 13, 18, 0.76), 0 0 0 2px #c6f432, 0 8px 24px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          pointerEvents: 'none'
        }}
      />

      {/* Game Style Guided Tooltip Card */}
      <div
        style={{
          position: 'fixed',
          top: `${Math.max(16, top)}px`,
          left: `${Math.max(16, left)}px`,
          width: `${cardWidth}px`,
          backgroundColor: '#12161c',
          color: '#f4efe3',
          borderRadius: '14px',
          border: '1.5px solid #c6f432',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.65), 0 4px 12px rgba(0, 0, 0, 0.3)',
          padding: '16px 18px',
          fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
          pointerEvents: 'auto',
          zIndex: 100000,
          transition: 'all 0.25s ease-out',
          backdropFilter: 'blur(12px)'
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header with Mascot Avatar & Game HUD */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Mascot Avatar Portrait */}
            <div 
              style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                backgroundColor: '#1b2210', 
                border: '1.5px solid #c6f432',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2l9 3v7c0 5-4 8-9 10-5-2-9-5-9-10V5z" fill="#e98a2e"/>
                <circle cx="9" cy="11" r="2" fill="#22d3ee"/>
                <circle cx="15" cy="11" r="2" fill="#22d3ee"/>
                <rect x="8" y="15" width="8" height="2" rx="1" fill="#c6f432"/>
              </svg>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ 
                  fontSize: '0.68rem', 
                  fontWeight: 800, 
                  letterSpacing: '0.06em', 
                  color: '#c6f432',
                  textTransform: 'uppercase'
                }}>
                  Mascot Guided Tour
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(198, 244, 50, 0.15)',
                  color: '#c6f432',
                  padding: '1px 6px',
                  borderRadius: '99px',
                  border: '1px solid rgba(198, 244, 50, 0.3)'
                }}>
                  Step {currentStepIndex + 1} of {TOUR_STEPS.length}
                </span>
              </div>
              <strong style={{ fontSize: '0.95rem', color: '#fff' }}>
                {step.title}
              </strong>
            </div>
          </div>

          {/* Sound & Dismiss controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleToggleAudio}
              style={{
                background: isAudioMuted ? 'rgba(255,255,255,0.08)' : 'rgba(198, 244, 50, 0.2)',
                border: '1px solid ' + (isAudioMuted ? 'rgba(255,255,255,0.15)' : '#c6f432'),
                color: isAudioMuted ? '#8f9ba8' : '#c6f432',
                borderRadius: '8px',
                padding: '5px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                transition: 'all 0.15s'
              }}
              title={isAudioMuted ? 'Turn Audio Voice On' : 'Stop Audio Voice'}
            >
              {isAudioMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span>{isAudioMuted ? 'Muted' : isSpeaking ? 'Speaking...' : 'Audio'}</span>
            </button>

            <button
              onClick={dismissTour}
              style={{
                background: 'none',
                border: 'none',
                color: '#8f9ba8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
              title="Skip Tutorial"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Mascot Explanation: ONE clear short sentence */}
        <div 
          style={{ 
            fontSize: '0.88rem', 
            lineHeight: 1.45, 
            color: '#e2e8f0', 
            marginBottom: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            padding: '10px 12px',
            borderRadius: '10px',
            border: '1px solid rgba(198, 244, 50, 0.2)'
          }}
        >
          {step.sentence}
        </div>

        {/* Step Progress Dots */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === currentStepIndex ? '18px' : '6px',
                  height: '6px',
                  borderRadius: '99px',
                  backgroundColor: i === currentStepIndex ? '#c6f432' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.25s'
                }}
              />
            ))}
          </div>

          {/* Action Buttons: Stop Audio, Skip, OK, Next */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={dismissTour}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#94a3b8',
                borderRadius: '99px',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Skip
            </button>

            <button
              onClick={handleOk}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff',
                borderRadius: '99px',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Check size={12} color="#c6f432" />
              <span>OK</span>
            </button>

            <button
              onClick={handleNext}
              style={{
                backgroundColor: '#c6f432',
                border: '1px solid #c6f432',
                color: '#121802',
                borderRadius: '99px',
                padding: '5px 14px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
              }}
            >
              <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

