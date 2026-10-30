import React, { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import { BrandRule, FindingCategory, FindingSeverity } from '../../types';
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  Database,
  X,
  FileText
} from 'lucide-react';

export const RulesPage: React.FC = () => {
  const { rules, addRule, accountType } = useDemo();

  const isOperations = accountType === 'brandguard_operations';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Rule Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<FindingCategory>('brand_rules');
  const [newType, setNewType] = useState<BrandRule['type']>('prohibited_term');
  const [newPattern, setNewPattern] = useState('');
  const [newAlternative, setNewAlternative] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [newSeverity, setNewSeverity] = useState<FindingSeverity>('warning');
  const [newSource, setNewSource] = useState('');

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addRule({
      title: newTitle,
      category: newCategory,
      type: newType,
      termOrPattern: newPattern,
      preferredAlternative: newAlternative,
      explanation: newExplanation,
      severity: newSeverity,
      status: 'approved',
      sourceDoc: newSource || 'Brand Strategy Committee Directive 2026'
    });

    setShowAddModal(false);
    // Reset form
    setNewTitle('');
    setNewPattern('');
    setNewAlternative('');
    setNewExplanation('');
  };

  const filteredRules = rules.filter(r => {
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesType = selectedType === 'all' || r.type === selectedType;
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.explanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (r.termOrPattern && r.termOrPattern.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesType && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '4px' }}>Rules & Terminology Index</h1>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.9rem' }}>
            Curate approved terms, prohibited superlatives, mandatory disclaimers, and brand voice constraints.
          </p>
        </div>

        {isOperations && (
          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn btn-primary"
            style={{ gap: '6px' }}
          >
            <Plus size={16} />
            <span>Create Brand Rule</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div 
        className="card-panel" 
        style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '14px', 
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--color-muted-slate)" />
          <input 
            type="text" 
            placeholder="Search rules, banned terms, or alternatives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gray)', fontSize: '0.85rem' }}
          >
            <option value="all">All Categories</option>
            <option value="brand_rules">Brand Rules</option>
            <option value="terminology">Terminology</option>
            <option value="claim_verification">Claim Verification</option>
            <option value="tone">Tone & Voice</option>
            <option value="accessibility">Accessibility</option>
          </select>

          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gray)', fontSize: '0.85rem' }}
          >
            <option value="all">All Rule Types</option>
            <option value="prohibited_term">Prohibited Terms</option>
            <option value="approved_term">Approved Terms</option>
            <option value="disclaimer">Required Disclaimers</option>
            <option value="voice">Brand Voice Rules</option>
            <option value="restriction">Content Restrictions</option>
          </select>
        </div>
      </div>

      {/* Rules List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {filteredRules.map(r => (
          <div 
            key={r.id} 
            className="card-panel"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between',
              gap: '14px',
              borderLeft: r.severity === 'critical' ? '4px solid var(--color-error)' : r.severity === 'warning' ? '4px solid var(--color-warning)' : '4px solid var(--color-evidence-teal)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="var(--color-evidence-teal)" />
                  <strong style={{ fontSize: '0.95rem', color: 'var(--color-deep-ink)' }}>{r.title}</strong>
                </div>
                <span className={`badge ${r.severity === 'critical' ? 'badge-critical' : r.severity === 'warning' ? 'badge-expiring' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                  {r.severity}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{r.type.replace('_', ' ')}</span>
                <span className="badge badge-teal" style={{ fontSize: '0.65rem' }}>{r.category}</span>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--color-deep-ink)', lineHeight: 1.5, marginBottom: '12px' }}>
                {r.explanation}
              </p>

              {r.termOrPattern && (
                <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>Flagged Pattern: </span>
                  <code>{r.termOrPattern}</code>
                </div>
              )}

              {r.preferredAlternative && (
                <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-evidence-teal-subtle)', borderRadius: '6px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--color-evidence-teal)', fontWeight: 600 }}>Preferred / Required Alternative: </span>
                  <strong>{r.preferredAlternative}</strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-muted-slate)', paddingTop: '10px', borderTop: '1px solid var(--color-border-subtle)' }}>
              <span>Source: {r.sourceDoc}</span>
              <span>Dismissals: {r.dismissalCount}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(20, 33, 43, 0.6)', 
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div 
            style={{ 
              backgroundColor: 'var(--color-surface-white)', 
              borderRadius: 'var(--radius-xl)', 
              maxWidth: '600px', 
              width: '100%', 
              padding: '28px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--color-border-gray)',
              color: 'var(--color-deep-ink)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Create Brand & Terminology Rule</h3>
              <button onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateRule}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Rule Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Prohibit Unqualified AI Performance Superlatives"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gray)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Category</label>
                  <select 
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gray)', fontSize: '0.85rem' }}
                  >
                    <option value="brand_rules">Brand Rules</option>
                    <option value="terminology">Terminology</option>
                    <option value="claim_verification">Claim Verification</option>
                    <option value="tone">Tone & Voice</option>
                    <option value="accessibility">Accessibility</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Rule Type</label>
                  <select 
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gray)', fontSize: '0.85rem' }}
                  >
                    <option value="prohibited_term">Prohibited Term</option>
                    <option value="approved_term">Approved Term</option>
                    <option value="disclaimer">Required Disclaimer</option>
                    <option value="voice">Brand Voice Rule</option>
                    <option value="restriction">Content Restriction</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Flagged Words or Phrases (comma separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. revolutionary AI, magical, 100% bug-free"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gray)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Approved Alternative</label>
                <input 
                  type="text"
                  placeholder="e.g. enterprise-grade verified intelligence"
                  value={newAlternative}
                  onChange={(e) => setNewAlternative(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gray)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Policy Rationale / Explanation *</label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Explain why this rule exists and cite regulatory/brand reasons..."
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gray)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Severity</label>
                  <select 
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gray)', fontSize: '0.85rem' }}
                  >
                    <option value="critical">Critical (Blocks Publication)</option>
                    <option value="warning">Warning (Review Recommended)</option>
                    <option value="advisory">Advisory (Style Note)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Source Document Citation</label>
                  <input 
                    type="text"
                    placeholder="e.g. Corporate Stylebook 2026, p. 8"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gray)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save & Enforce Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

