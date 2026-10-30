import React, { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import { Send, CheckCircle2, AlertCircle, Building2, Mail, User, Users, MessageSquare, Loader2, ShieldCheck } from 'lucide-react';
import { submitInquiry } from '../../services/api';

export const ContactSection: React.FC = () => {
  const { addLead } = useDemo();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '10-50 reviewers',
    message: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required.';
    if (!formData.email.trim()) {
      newErrors.email = 'Work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please provide a valid work email address.';
    }
    if (!formData.company.trim()) newErrors.company = 'Company name is required.';
    if (!formData.message.trim()) newErrors.message = 'Please provide details about your compliance workflow.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await submitInquiry({
        contact_name: formData.name,
        email: formData.email,
        company_name: formData.company,
        team_size: formData.teamSize,
        message: formData.message,
        request_type: 'Enterprise Governance Evaluation',
        service_interest: 'Full Enterprise Governance & Claim Verification',
        source_page: '/#contact',
        source_form: 'enterprise_evaluation_contact'
      });

      // Synchronize with demo state for backward compatibility
      addLead(formData);
      setSubmissionId(res.submission_id);
      setSubmitted(true);
    } catch (err: any) {
      setApiError(err.message || 'Failed to submit enterprise evaluation request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section 
      id="contact"
      style={{ 
        padding: '84px 24px', 
        backgroundColor: 'var(--color-warm-ivory)' 
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '16px' }}>
            Request an enterprise governance evaluation
          </h2>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Speak with our brand governance engineers. We will review your existing brand guidelines, claim structure, and team approval hierarchies.
          </p>
        </div>

        <div 
          className="card-panel"
          style={{ 
            backgroundColor: 'var(--color-surface-white)', 
            borderRadius: 'var(--radius-xl)', 
            padding: '36px',
            boxShadow: 'var(--shadow-md)' 
          }}
        >
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div 
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--color-success-subtle)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  border: '1px solid rgba(40, 125, 88, 0.25)'
                }}
              >
                <CheckCircle2 size={32} color="var(--color-success)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Inquiry Registered & Routed to Operations Inbox</h3>
              <p style={{ color: 'var(--color-muted-slate)', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                Thank you, <strong>{formData.name}</strong>. Your enterprise governance inquiry (Reference <code>{submissionId || 'INB-2026'}</code>) has been safely stored in the database and queued in the <strong>BrandGuard Operations Admin Inbox</strong>.
              </p>
              <button 
                onClick={() => {
                  setSubmitted(false);
                  setSubmissionId(null);
                  setFormData({ name: '', email: '', company: '', teamSize: '10-50 reviewers', message: '' });
                }} 
                className="btn btn-secondary btn-sm"
              >
                Submit Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {apiError && (
                <div 
                  style={{ 
                    padding: '12px 16px', 
                    borderRadius: 'var(--radius-md)', 
                    backgroundColor: 'rgba(220, 38, 38, 0.08)',
                    color: '#991b1b',
                    border: '1px solid #dc2626',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '20px'
                  }}
                >
                  <AlertCircle size={18} color="#dc2626" />
                  <span>{apiError}</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label htmlFor="contact-name" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      id="contact-name"
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Jane Doe"
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: 'var(--radius-md)',
                        border: errors.name ? '1px solid var(--color-error)' : '1px solid var(--color-border-gray)',
                        backgroundColor: 'var(--color-surface-subtle)'
                      }}
                    />
                  </div>
                  {errors.name && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
                </div>

                <div>
                  <label htmlFor="contact-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Work Email *
                  </label>
                  <input 
                    id="contact-email"
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@company.com"
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: 'var(--radius-md)',
                      border: errors.email ? '1px solid var(--color-error)' : '1px solid var(--color-border-gray)',
                      backgroundColor: 'var(--color-surface-subtle)'
                    }}
                  />
                  {errors.email && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.email}</span>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label htmlFor="contact-company" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Company Name *
                  </label>
                  <input 
                    id="contact-company"
                    type="text" 
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Acme Global Inc."
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: 'var(--radius-md)',
                      border: errors.company ? '1px solid var(--color-error)' : '1px solid var(--color-border-gray)',
                      backgroundColor: 'var(--color-surface-subtle)'
                    }}
                  />
                  {errors.company && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.company}</span>}
                </div>

                <div>
                  <label htmlFor="contact-teamsize" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Content & Reviewer Team Size
                  </label>
                  <select 
                    id="contact-teamsize"
                    value={formData.teamSize}
                    onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-gray)',
                      backgroundColor: 'var(--color-surface-subtle)'
                    }}
                  >
                    <option value="1-10 reviewers">1-10 copywriters & reviewers</option>
                    <option value="10-50 reviewers">10-50 copywriters & reviewers</option>
                    <option value="50-200 reviewers">50-200 copywriters & reviewers</option>
                    <option value="200+ enterprise">200+ global enterprise members</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label htmlFor="contact-message" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Compliance Objectives / Message *
                </label>
                <textarea 
                  id="contact-message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your current brand review challenges, guideline formats, or target timeline..."
                  style={{ 
                    width: '100%', 
                    padding: '10px 14px', 
                    borderRadius: 'var(--radius-md)',
                    border: errors.message ? '1px solid var(--color-error)' : '1px solid var(--color-border-gray)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    resize: 'vertical'
                  }}
                />
                {errors.message && <span style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{errors.message}</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={14} color="var(--color-evidence-teal)" />
                  <span>Encrypted submission stored in database. Operations review queued.</span>
                </span>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ minWidth: '180px' }}
                >
                  {submitting ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Loader2 size={15} className="spin-animate" />
                      <span>Submitting...</span>
                    </span>
                  ) : (
                    <>
                      <span>Submit Inquiry</span>
                      <Send size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

