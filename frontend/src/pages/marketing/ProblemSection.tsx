import React from 'react';
import { 
  Clock, 
  BookX, 
  ShieldAlert, 
  MessageSquareWarning, 
  Palette, 
  EyeOff, 
  GitPullRequestDraft,
  Sparkles
} from 'lucide-react';

export const ProblemSection: React.FC = () => {
  const problems = [
    {
      icon: <Clock size={20} color="var(--color-signal-coral)" />,
      title: 'Expired & Outdated Claims',
      description: 'Marketing collateral cites obsolete benchmarks, discontinued trial data, or expired awards, exposing organizations to regulatory and legal challenges.'
    },
    {
      icon: <BookX size={20} color="var(--color-signal-coral)" />,
      title: 'Inconsistent Terminology',
      description: 'Distributed teams mix banned jargon, promotional hype words ("revolutionary AI"), and conflicting product naming conventions across campaigns.'
    },
    {
      icon: <ShieldAlert size={20} color="var(--color-signal-coral)" />,
      title: 'Brand Guideline Violations',
      description: 'Hundreds of pages of static PDF playbooks gather dust on intranet drives while creators inadvertently breach typography, logo, and messaging rules.'
    },
    {
      icon: <MessageSquareWarning size={20} color="var(--color-signal-coral)" />,
      title: 'Unsupported Statements',
      description: 'Content claims market leadership or efficacy without pointing to a verifiable, owned evidence document or audited customer ledger entry.'
    },
    {
      icon: <Palette size={20} color="var(--color-signal-coral)" />,
      title: 'Off-Brand Visual Assets',
      description: 'Campaign visuals drift into unapproved color palettes, distorted brand marks, and unverified creative formats without digital safety gates.'
    },
    {
      icon: <EyeOff size={20} color="var(--color-signal-coral)" />,
      title: 'Accessibility Non-Compliance',
      description: 'Marketing decks and landing pages fail WCAG 2.1 AA text-to-background contrast minimums, locking out users and creating compliance exposure.'
    },
    {
      icon: <GitPullRequestDraft size={20} color="var(--color-signal-coral)" />,
      title: 'Opaque Review Bottlenecks',
      description: 'Slack threads and fragmented emails replace auditable signoffs, leaving zero traceable records of who approved a critical marketing statement.'
    },
    {
      icon: <Sparkles size={20} color="var(--color-signal-coral)" />,
      title: 'Ungoverned AI Drafts',
      description: 'Generative AI tools flood marketing pipelines with plausible-sounding but unverified claims, fabricated product metrics, and legally binding commitments.'
    }
  ];

  return (
    <section 
      style={{ 
        padding: '76px 24px', 
        backgroundColor: 'var(--color-surface-white)',
        borderTop: '1px solid var(--color-border-gray)',
        borderBottom: '1px solid var(--color-border-gray)',
        transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '14px', letterSpacing: '-0.02em' }}>
            Why enterprise marketing slips out of compliance
          </h2>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Modern enterprise content velocity overwhelms manual brand reviews. Without an active claim ledger and evidence verification engine, risk silently compounds.
          </p>
        </div>

        {/* 4 columns by 2 rows on desktop, 2 columns on tablet, 1 column on mobile */}
        <div className="problems-grid">
          {problems.map((prob, idx) => (
            <div 
              key={idx}
              className="interactive-card"
              style={{ 
                padding: '22px', 
                backgroundColor: 'var(--color-surface-subtle)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-gray)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                height: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div 
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: 'var(--radius-md)', 
                  backgroundColor: 'var(--color-surface-white)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--color-border-gray)',
                  flexShrink: 0
                }}
              >
                {prob.icon}
              </div>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-deep-ink)', fontWeight: 600 }}>{prob.title}</h3>
              <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.86rem', lineHeight: 1.55, margin: 0, flex: 1 }}>
                {prob.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
