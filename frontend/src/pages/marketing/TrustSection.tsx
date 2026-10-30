import React from 'react';
import { 
  UserCheck, 
  Lock, 
  FileCheck2, 
  Info, 
  Scale, 
  ShieldAlert 
} from 'lucide-react';

export const TrustSection: React.FC = () => {
  const principles = [
    {
      icon: <UserCheck size={20} color="var(--color-evidence-teal)" />,
      title: 'Zero Autonomous Publishing',
      desc: 'BrandGuard never publishes or modifies live content autonomously. The platform serves as an evidence verification advisor—final authorization rests solely with authorized human brand reviewers.'
    },
    {
      icon: <Lock size={20} color="var(--color-evidence-teal)" />,
      title: 'Company Data Isolation',
      desc: 'Every tenant workspace maintains strict logical and cryptographic segregation. Ingested brand playbooks, internal guidelines, and claim ledgers are never mixed across organizations or used to train third-party public models.'
    },
    {
      icon: <FileCheck2 size={20} color="var(--color-evidence-teal)" />,
      title: 'Ground Truth Citations',
      desc: 'Every flagged violation or suggestion cites a specific source document passage, page number, and registered claim owner. No finding is rendered without traceable evidence.'
    },
    {
      icon: <Info size={20} color="var(--color-evidence-teal)" />,
      title: 'AI Involvement Disclosure',
      desc: 'Whenever AI-assisted retrieval or syntactic checking is applied, it is explicitly disclosed on the Brand Passport audit seal to uphold organizational transparency.'
    },
    {
      icon: <Scale size={20} color="var(--color-evidence-teal)" />,
      title: 'Governance, Not Legal Counsel',
      desc: 'BrandGuard facilitates internal brand compliance, terminology adherence, and factual veracity verification. The platform does not render formal legal counsel or statutory advice.'
    },
    {
      icon: <ShieldAlert size={20} color="var(--color-evidence-teal)" />,
      title: 'Transparent Error Accountability',
      desc: 'Our review queue empowers reviewers to record specific dismissal reasons (false positive, unclear rule, exception), holding the governance system accountable for continuous refinement.'
    }
  ];

  return (
    <section 
      id="trust"
      style={{ 
        padding: '84px 24px', 
        backgroundColor: 'var(--color-warm-ivory)',
        transition: 'background-color var(--transition-normal)'
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Trust & Transparency Commitments
          </h2>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Brand governance demands institutional integrity. Here are the core ethical and architectural boundaries that govern BrandGuard.
          </p>
        </div>

        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '24px' 
          }}
        >
          {principles.map((pr, i) => (
            <div 
              key={i}
              className="interactive-card"
              style={{ 
                backgroundColor: 'var(--color-surface-white)', 
                border: '1px solid var(--color-border-gray)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                height: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div 
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: 'var(--radius-md)', 
                  backgroundColor: 'var(--color-evidence-teal-subtle)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(22, 124, 120, 0.2)',
                  flexShrink: 0
                }}
              >
                {pr.icon}
              </div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--color-deep-ink)', fontWeight: 600 }}>{pr.title}</h3>
              <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.9rem', lineHeight: 1.55, margin: 0 }}>
                {pr.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
