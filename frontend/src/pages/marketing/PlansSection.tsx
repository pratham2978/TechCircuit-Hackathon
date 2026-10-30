import React from 'react';
import { Check, ArrowRight } from 'lucide-react';

export const PlansSection: React.FC = () => {
  const plans = [
    {
      name: 'Starter',
      target: 'Emerging marketing teams requiring structured brand & claim governance.',
      pricing: 'Contact for pricing',
      badge: 'Team Edition',
      popular: false,
      features: [
        { label: 'One dedicated company workspace', live: true },
        { label: 'Up to 5 authenticated users', live: true },
        { label: 'Plain text and document review', live: true },
        { label: 'Rule and fact ledger library', live: true },
        { label: 'Mandatory human approval workflow', live: true },
        { label: 'Basic Brand Passport export', live: true }
      ]
    },
    {
      name: 'Business',
      target: 'Multi-brand enterprises managing high-volume campaigns and localized collateral.',
      pricing: 'Contact for pricing',
      badge: 'Most Popular',
      popular: true,
      features: [
        { label: 'All Starter capabilities included', live: true },
        { label: 'Up to 25 cross-functional users', live: true },
        { label: 'Guideline Health & Dismissal Insights', live: true },
        { label: 'Assisted tenant onboarding', live: true },
        { label: 'Image palette checks', live: false }, // Roadmap item
        { label: 'WCAG 2.1 AA accessibility checks', live: false } // Roadmap item
      ]
    },
    {
      name: 'Enterprise',
      target: 'Global organizations requiring sovereign data isolation and customized compliance packs.',
      pricing: 'Custom enterprise agreement',
      badge: 'Regulated Industries',
      popular: false,
      features: [
        { label: 'All Business capabilities included', live: true },
        { label: 'Unlimited workspace scale & users', live: true },
        { label: 'Custom industry rule packs (Pharma/Fintech)', live: true },
        { label: 'SAML / Okta SSO integration', live: false }, // Roadmap
        { label: 'Sovereign customer data-retention controls', live: true },
        { label: 'Dedicated compliance engineering support', live: true },
        { label: 'Automated cryptographic audit export', live: true }
      ]
    }
  ];

  return (
    <section 
      id="plans"
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
            Predictable plans tailored to your brand scale
          </h2>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Every tier guarantees tenant policy segregation, human publishing control, and complete evidence citation traceability.
          </p>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--color-muted-slate)' }}>
            <em>Pricing is tailored to enterprise review volume. Contact our team for formal licensing agreements.</em>
          </div>
        </div>

        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: '28px',
            alignItems: 'stretch'
          }}
        >
          {plans.map((p, idx) => (
            <div 
              key={idx}
              className="interactive-card"
              style={{ 
                backgroundColor: 'var(--color-surface-subtle)',
                border: p.popular ? '2px solid var(--color-signal-coral)' : '1px solid var(--color-border-gray)',
                borderRadius: 'var(--radius-xl)',
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                boxShadow: p.popular ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                height: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div>
                {/* Header with Consistent Badge Placement */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '1.4rem', color: 'var(--color-deep-ink)', fontWeight: 700 }}>{p.name}</h3>
                  <span 
                    style={{ 
                      backgroundColor: p.popular ? 'var(--color-signal-coral)' : 'var(--color-surface-white)',
                      color: p.popular ? '#FFFFFF' : 'var(--color-muted-slate)',
                      border: p.popular ? 'none' : '1px solid var(--color-border-gray)',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {p.badge}
                  </span>
                </div>

                <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.85rem', minHeight: '44px', lineHeight: 1.45 }}>
                  {p.target}
                </p>

                <div style={{ margin: '20px 0', paddingBottom: '20px', borderBottom: '1px solid var(--color-border-gray)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-deep-ink)', fontFamily: 'var(--font-display)' }}>
                    {p.pricing}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>Annual enterprise agreement</span>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', padding: 0 }}>
                  {p.features.map((feat, fidx) => (
                    <li key={fidx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                      <div 
                        style={{ 
                          width: '18px', 
                          height: '18px', 
                          borderRadius: '50%', 
                          backgroundColor: feat.live ? 'var(--color-evidence-teal-subtle)' : 'var(--color-border-subtle)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Check size={12} color={feat.live ? 'var(--color-evidence-teal)' : 'var(--color-muted-slate)'} />
                      </div>
                      <span style={{ color: feat.live ? 'var(--color-deep-ink)' : 'var(--color-muted-slate)' }}>
                        {feat.label} {!feat.live && <em style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)' }}>(Roadmap)</em>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <a 
                href="#contact" 
                className={`btn ${p.popular ? 'btn-primary' : 'btn-dark'}`}
                style={{ width: '100%', padding: '10px 16px' }}
              >
                <span>Request {p.name} Proposal</span>
                <ArrowRight size={16} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
