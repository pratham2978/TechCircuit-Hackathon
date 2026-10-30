import React from 'react';
import { 
  Building2, 
  FileUp, 
  CheckSquare, 
  Database, 
  FileText, 
  SearchCheck, 
  Sparkles, 
  UserCheck, 
  Award, 
  TrendingUp 
} from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      icon: <Building2 size={20} color="var(--info)" />,
      title: 'Company Onboarding',
      desc: 'Set up isolated tenant workspace with tailored role hierarchies and brand profile.'
    },
    {
      num: '02',
      icon: <FileUp size={20} color="var(--info)" />,
      title: 'Guideline & Doc Ingestion',
      desc: 'Upload PDF and DOCX brand playbooks, tone guides, and clinical manuals.'
    },
    {
      num: '03',
      icon: <CheckSquare size={20} color="var(--info)" />,
      title: 'Proposed Rule Review',
      desc: 'System extracts candidate policies; Brand Managers approve or refine proposed rules.'
    },
    {
      num: '04',
      icon: <Database size={20} color="var(--info)" />,
      title: 'Approved Fact & Claim Ledger',
      desc: 'Verified claims with validity dates, owners, and page citations are cataloged.'
    },
    {
      num: '05',
      icon: <FileText size={20} color="var(--info)" />,
      title: 'Submission & Intent Card',
      desc: 'Creators submit drafts alongside explicit intent cards (goal, audience, core message).'
    },
    {
      num: '06',
      icon: <SearchCheck size={20} color="var(--info)" />,
      title: 'Multi-Vector Checking',
      desc: 'Automated verification across brand rules, claim veracity, tone, and WCAG accessibility.'
    },
    {
      num: '07',
      icon: <Sparkles size={20} color="var(--info)" />,
      title: 'Suggested Fixes & Feedback',
      desc: 'Interactive correction diffs with 1-click replacement and per-finding feedback.'
    },
    {
      num: '08',
      icon: <UserCheck size={20} color="var(--info)" />,
      title: 'Human Reviewer Decision',
      desc: 'Designated reviewers inspect evidence citations and approve, reject, or request changes.'
    },
    {
      num: '09',
      icon: <Award size={20} color="var(--info)" />,
      title: 'Brand Passport Audit Seal',
      desc: 'An immutable compliance passport is minted, recording timestamped decisions.'
    },
    {
      num: '10',
      icon: <TrendingUp size={20} color="var(--info)" />,
      title: 'Guideline Health Refinement',
      desc: 'Reviewer dismissal metrics pinpoint ambiguous rules for continuous refinement.'
    }
  ];

  return (
    <section 
      id="how-it-works"
      style={{ 
        padding: '84px 24px', 
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '16px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            How BrandGuard governs enterprise publishing
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            A disciplined 10-step lifecycle connecting policy documentation, active claim ledgers, and human signoff decisions.
          </p>
        </div>

        {/* Balanced 10-Step Lifecycle Grid: 5x2 on Desktop, 3x on Tablet, 2x on Mobile */}
        <div className="lifecycle-grid">
          {steps.map((st) => (
            <div 
              key={st.num}
              className="interactive-card"
              style={{ 
                backgroundColor: 'var(--surface)', 
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '22px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                height: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span 
                  style={{ 
                    fontFamily: 'var(--font-display)', 
                    fontWeight: 700, 
                    fontSize: '1.25rem', 
                    color: 'var(--info)',
                    letterSpacing: '-0.02em'
                  }}
                >
                  {st.num}
                </span>
                <div 
                  style={{ 
                    padding: '8px', 
                    borderRadius: 'var(--radius-md)', 
                    backgroundColor: 'var(--info-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(22, 124, 120, 0.2)'
                  }}
                >
                  {st.icon}
                </div>
              </div>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.35, margin: 0 }}>
                {st.title}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0, flex: 1 }}>
                {st.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
