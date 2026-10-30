import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { 
  TrendingUp, 
  AlertTriangle, 
  ThumbsUp, 
  ThumbsDown, 
  RotateCcw, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  BarChart2, 
  Edit3,
  Info
} from 'lucide-react';

export const InsightsPage: React.FC = () => {
  const { rules, claims, documents } = useDemo();
  const navigate = useNavigate();

  // Sort rules by dismissals
  const sortedByDismissal = [...rules].sort((a, b) => b.dismissalCount - a.dismissalCount);

  // Collect feedback from all document findings
  const allFindings = documents.flatMap(d => d.findings);
  const usefulFeedbackCount = allFindings.filter(f => f.feedback === 'useful').length;
  const wrongFeedbackCount = allFindings.filter(f => f.feedback === 'wrong').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '4px' }}>Guideline Health & Analytics</h1>
        <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.9rem' }}>
          Data-driven policy refinement: Analyze frequent violations, reviewer dismissal patterns, and ambiguous rules.
        </p>
      </div>

      {/* Demo analytics disclaimer */}
      <div 
        style={{ 
          padding: '10px 14px', 
          backgroundColor: 'var(--color-warm-ivory)', 
          borderRadius: 'var(--radius-md)', 
          border: '1px solid var(--color-border-gray)',
          fontSize: '0.8rem',
          color: 'var(--color-muted-slate)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <Info size={15} color="var(--color-evidence-teal)" />
        <span>
          <strong>Demonstration Telemetry:</strong> Metrics are aggregated from the local demonstration store to showcase organizational feedback loops.
        </span>
      </div>

      {/* Analytics Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div className="card-panel">
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted-slate)' }}>MOST DISMISSED POLICY</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '6px', color: 'var(--color-deep-ink)' }}>
            Unqualified AI Hyperbole
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>
            8 dismissals • Potential ambiguity in definition
          </span>
        </div>

        <div className="card-panel">
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted-slate)' }}>TOP DISMISSAL REASON</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '6px', color: 'var(--color-evidence-teal)' }}>
            ok_in_context (52%)
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
            Specialized technical collateral usage
          </span>
        </div>

        <div className="card-panel">
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted-slate)' }}>HUMAN USEFULNESS RATING</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '6px', color: 'var(--color-success)' }}>
            88% Favorable
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
            {usefulFeedbackCount} Useful vs {wrongFeedbackCount} Flagged Wrong
          </span>
        </div>

        <div className="card-panel">
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted-slate)' }}>CLAIMS AT RISK</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '6px', color: 'var(--color-signal-coral)' }}>
            2 Expiring / Unverified
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
            Require source evidentiary renewal
          </span>
        </div>
      </div>

      {/* Main Split: Most Frequently Dismissed Rules vs Dismissal Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Left: Frequently Dismissed Rules */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Policies Frequently Dismissed by Reviewers</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>Candidate for clarification</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedByDismissal.map(r => (
              <div 
                key={r.id}
                style={{ 
                  padding: '14px', 
                  backgroundColor: 'var(--color-warm-ivory)', 
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--color-deep-ink)' }}>{r.title}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                    Category: {r.category} • Severity: {r.severity}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="badge badge-expiring" style={{ fontSize: '0.7rem' }}>
                    {r.dismissalCount} Dismissals
                  </span>
                  <Link 
                    to="/app/rules" 
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    <Edit3 size={12} />
                    <span>Refine Rule</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Dismissal Categorization Breakdown */}
        <div className="card-panel">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Reviewer Justification Breakdown</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', marginBottom: '16px' }}>
            When reviewers bypass a flagged finding, they submit a structured rationale. This data feeds back into the Brand Manager playbook refinement cycle.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <strong>ok_in_context (Specialized Context)</strong>
                <span>52%</span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--color-border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '52%', height: '100%', backgroundColor: 'var(--color-evidence-teal)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <strong>rule_unclear (Ambiguous Guideline Text)</strong>
                <span>28%</span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--color-border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '28%', height: '100%', backgroundColor: 'var(--color-warning)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <strong>approved_exception (Executive Waiver)</strong>
                <span>12%</span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--color-border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '12%', height: '100%', backgroundColor: 'var(--color-signal-coral)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                <strong>false_positive (Algorithmic Parse Error)</strong>
                <span>8%</span>
              </div>
              <div style={{ height: '8px', backgroundColor: 'var(--color-border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '8%', height: '100%', backgroundColor: 'var(--color-error)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

