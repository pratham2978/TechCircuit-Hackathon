import React, { useState } from 'react';
import { 
  FileText, 
  Database, 
  SearchCheck, 
  Sparkles, 
  Award, 
  Sliders, 
  ShieldCheck, 
  Palette, 
  Clock, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const FeatureShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'core' | 'intelligence' | 'audit'>('core');

  const features = {
    core: [
      {
        title: 'Approved Claim Ledger',
        desc: 'Centralized registry of verified company statements, each tied to source page numbers, executive owners, and explicit validity expiration dates.',
        status: 'Operational in UI'
      },
      {
        title: 'Dynamic Rule & Terminology Index',
        desc: 'Proactive catalog of approved alternatives, strictly prohibited superlatives, and required regional disclaimer clauses.',
        status: 'Operational in UI'
      },
      {
        title: 'Guideline Document Library',
        desc: 'Support for brand manuals, clinical messaging standards, and voice guides with extracted passage mapping and rule drafting.',
        status: 'Operational in UI'
      },
      {
        title: 'Human Reviewer Cockpit',
        desc: 'Formal approval queue where designated reviewers examine evidence-linked findings to Approve, Reject, or Request Changes.',
        status: 'Operational in UI'
      }
    ],
    intelligence: [
      {
        title: 'Evidence-Linked Verification',
        desc: 'Every check links directly to an authoritative source document passage and claim owner, preventing ungrounded AI hallucination.',
        status: 'Operational in UI'
      },
      {
        title: 'Interactive 1-Click Fix Suggestions',
        desc: 'Provides compliant alternative phrasing that writers can accept into their manuscript with a single click.',
        status: 'Operational in UI'
      },
      {
        title: 'Retrieval-Augmented Fact Checking (RAG)',
        desc: 'PostgreSQL pgvector neural semantic search across high-dimensional claim embeddings.',
        status: 'Roadmap (Backend Phase)'
      },
      {
        title: 'Visual Palette & WCAG Contrast Scan',
        desc: 'Automated pixel inspection verifying 4.5:1 text-to-background contrast and approved color token adherence.',
        status: 'Roadmap (Image Engine Phase)'
      }
    ],
    audit: [
      {
        title: 'Brand Passport Certification',
        desc: 'Tamper-evident publication record certifying all checks performed, citations verified, and the approving human reviewer.',
        status: 'Operational in UI'
      },
      {
        title: 'Guideline Health & Dismissal Analytics',
        desc: 'Identifies frequently dismissed rules (false positive, unclear rule, exception) to refine corporate policy documentation.',
        status: 'Operational in UI'
      },
      {
        title: 'Per-Finding Human Feedback',
        desc: 'Writers and reviewers can flag individual checks as Useful or Wrong, creating a closed-loop training dataset.',
        status: 'Operational in UI'
      },
      {
        title: 'Immutable Audit Trail',
        desc: 'Granular event logging recording actor, timestamp, and decision rationale for enterprise compliance officers.',
        status: 'Operational in UI'
      }
    ]
  };

  return (
    <section 
      id="features"
      style={{ 
        padding: '84px 24px', 
        backgroundColor: 'var(--color-surface-white)',
        borderTop: '1px solid var(--color-border-gray)',
        borderBottom: '1px solid var(--color-border-gray)',
        transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Engineered for precision brand governance
          </h2>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Every capability is designed around the principle of evidence-first verification with human authority.
          </p>
        </div>

        {/* Tab Navigation */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '12px', 
            marginBottom: '40px',
            flexWrap: 'wrap'
          }}
        >
          <button 
            className={`btn ${activeTab === 'core' ? 'btn-dark' : 'btn-secondary'}`}
            onClick={() => setActiveTab('core')}
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            Core Governance
          </button>
          <button 
            className={`btn ${activeTab === 'intelligence' ? 'btn-dark' : 'btn-secondary'}`}
            onClick={() => setActiveTab('intelligence')}
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            Evidence & Intelligence
          </button>
          <button 
            className={`btn ${activeTab === 'audit' ? 'btn-dark' : 'btn-secondary'}`}
            onClick={() => setActiveTab('audit')}
            style={{ borderRadius: 'var(--radius-full)' }}
          >
            Audit & Brand Passport
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '24px' 
          }}
        >
          {features[activeTab].map((f, i) => {
            const isRoadmap = f.status.includes('Roadmap');
            return (
              <div 
                key={i}
                className="interactive-card"
                style={{ 
                  padding: '24px', 
                  backgroundColor: 'var(--color-surface-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border-gray)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px' }}>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--color-deep-ink)', fontWeight: 600 }}>{f.title}</h3>
                    {isRoadmap && (
                      <span className="badge badge-neutral" style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                        Roadmap
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                    {f.desc}
                  </p>
                </div>
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '0.75rem', 
                    color: isRoadmap ? 'var(--color-muted-slate)' : 'var(--color-evidence-teal)',
                    fontWeight: 600
                  }}
                >
                  {isRoadmap ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                  <span>{f.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
