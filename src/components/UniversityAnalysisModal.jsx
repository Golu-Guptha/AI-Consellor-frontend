import { useState } from 'react';
import { useProfile } from '../context/ProfileContext';

export default function UniversityAnalysisModal({ university, onClose }) {
    const { profile } = useProfile();

    if (!university || !university.ai_analysis) return null;

    const analysis = university.ai_analysis;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-[hsl(var(--color-bg-secondary))] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">{university.name}</h2>
                        <p className="text-[hsl(var(--color-text-muted))]">Your Personalized Match Analysis</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-2xl hover:text-[hsl(var(--color-primary))] transition-colors"
                    >
                        ×
                    </button>
                </div>

                {/* Profile Fit */}
                {analysis.profile_fit && analysis.profile_fit.score !== undefined && (
                    <div className="mb-6 p-4 bg-[hsl(var(--color-bg))] rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                ✅ Profile Fit
                            </h3>
                            <span className="text-2xl font-bold text-[hsl(var(--color-primary))]">
                                {analysis.profile_fit.score}/100
                            </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 bg-[hsl(var(--color-bg-secondary))] rounded-full overflow-hidden mb-3">
                            <div
                                className="h-full bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))]"
                                style={{ width: `${analysis.profile_fit.score}%` }}
                            />
                        </div>
                        {analysis.profile_fit.reasons && analysis.profile_fit.reasons.length > 0 && (
                            <ul className="space-y-2">
                                {analysis.profile_fit.reasons.map((reason, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                        <span className="text-green-500 mt-0.5">•</span>
                                        <span>{reason}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Budget Analysis */}
                {analysis.budget_analysis && (
                    <div className="mb-6 p-4 bg-[hsl(var(--color-bg))] rounded-lg">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            💵 Budget Analysis
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <p className="text-xs text-[hsl(var(--color-text-muted))] mb-1">Tuition</p>
                                <p className="text-xl font-bold">
                                    {(() => {
                                        const ba = analysis.budget_analysis;
                                        // Try explicit values first
                                        let val = ba.tuition ?? university.tuition_estimate;

                                        // If missing but we have gap & budget, infer it
                                        const userBudget = ba.user_budget ?? profile?.budget_max;

                                        if ((val === undefined || val === null || val === 0) && userBudget && ba.gap !== undefined) {
                                            if (!ba.within_budget) {
                                                val = userBudget + ba.gap;
                                            } else {
                                                // If within budget, gap might be surplus (budget - tuition) or 0
                                                // Usually gap logic in backend is max(0, tuition - budget) so gap is 0 if within budget.
                                                // If gap is 0, we can't infer tuition exactly (could be anything <= budget).
                                                // So we only infer if OVER budget (gap > 0).
                                                if (ba.gap > 0) val = userBudget - ba.gap;
                                            }
                                        }

                                        return val ? `$${Number(val).toLocaleString()}` : 'N/A';
                                    })()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-[hsl(var(--color-text-muted))] mb-1">Your Budget</p>
                                <p className="text-xl font-bold">
                                    ${(analysis.budget_analysis.user_budget ?? profile?.budget_max)?.toLocaleString() || 'N/A'}
                                </p>
                            </div>
                        </div>
                        {!analysis.budget_analysis.within_budget && analysis.budget_analysis.gap && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-600 p-3 rounded-lg mb-3 text-sm">
                                ⚠️ Over budget by ${analysis.budget_analysis.gap?.toLocaleString()}
                            </div>
                        )}
                        {analysis.budget_analysis.within_budget && (
                            <div className="bg-green-500/10 border border-green-500/30 text-green-600 p-3 rounded-lg mb-3 text-sm">
                                ✅ Within your budget
                            </div>
                        )}
                        {analysis.budget_analysis.recommendation && (
                            <p className="text-sm text-[hsl(var(--color-text-muted))]">
                                {analysis.budget_analysis.recommendation}
                            </p>
                        )}
                    </div>
                )}

                {/* Country Preference */}
                {analysis.country_preference && (
                    <div className="mb-6 p-4 bg-[hsl(var(--color-bg))] rounded-lg">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            🌍 Country Preference
                        </h3>
                        <div className={`p-3 rounded-lg text-sm ${analysis.country_preference.matches
                            ? 'bg-green-500/10 border border-green-500/30 text-green-600'
                            : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-600'
                            }`}>
                            {analysis.country_preference.matches ? '✅' : 'ℹ️'} {analysis.country_preference.message || 'No preference data'}
                        </div>
                    </div>
                )}

                {/* Acceptance & Risk */}
                {analysis.acceptance_score && analysis.risk_level && (
                    <div className="mb-6 p-4 bg-[hsl(var(--color-bg))] rounded-lg">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                            📊 Acceptance Likelihood & Risk
                        </h3>

                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-sm text-[hsl(var(--color-text-muted))] mb-1">Acceptance Chance</p>
                                <p className="text-3xl font-bold">
                                    {analysis.acceptance_score.percentage}%
                                </p>
                            </div>
                            <span className={`px-4 py-2 rounded-full font-bold ${analysis.acceptance_score.category === 'SAFE'
                                ? 'bg-green-500/20 text-green-600'
                                : analysis.acceptance_score.category === 'DREAM'
                                    ? 'bg-purple-500/20 text-purple-600'
                                    : 'bg-blue-500/20 text-blue-600'
                                }`}>
                                {analysis.acceptance_score.category}
                            </span>
                        </div>

                        {analysis.acceptance_score.reasoning && (
                            <p className="text-sm mb-4">{analysis.acceptance_score.reasoning}</p>
                        )}

                        <div className={`p-3 rounded-lg text-sm font-medium ${analysis.risk_level === 'low'
                            ? 'bg-green-500/10 border border-green-500/30 text-green-600'
                            : analysis.risk_level === 'high'
                                ? 'bg-red-500/10 border border-red-500/30 text-red-600'
                                : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-600'
                            }`}>
                            ⚠️ Overall Risk: {analysis.risk_level?.charAt(0).toUpperCase() + analysis.risk_level?.slice(1)}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 btn btn-secondary"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => {
                            onClose();
                            // Trigger add to shortlist
                            window.dispatchEvent(new CustomEvent('add-to-shortlist', { detail: university }));
                        }}
                        className="flex-1 btn btn-primary"
                    >
                        Add to Shortlist
                    </button>
                </div>
            </div>
        </div>
    );
}
