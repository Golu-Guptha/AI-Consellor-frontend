import React, { useState } from 'react';
import api from '../services/api';

export default function AddUniversityModal({ isOpen, onClose, onAdd }) {
    if (!isOpen) return null;

    const [formData, setFormData] = useState({
        name: '',
        country: '',
        city: '',
        domain: '',
        tuition_estimate: '',
        acceptance_rate: '',
        rank: '',
        website: ''
    });

    const [isEnriching, setIsEnriching] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [enrichError, setEnrichError] = useState(null);
    const [cacheMetadata, setCacheMetadata] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEnrich = async () => {
        if (!formData.name || !formData.country) {
            setEnrichError("Please enter Name and Country first.");
            return;
        }

        setIsEnriching(true);
        setEnrichError(null);

        try {
            const response = await api.post('/api/universities/enrich', {
                name: formData.name,
                country: formData.country
            });

            const enriched = response.data.enrichedData;
            if (enriched.error) {
                setEnrichError("AI could not find data for this university.");
            } else {
                setFormData(prev => ({
                    ...prev,
                    ...enriched,
                    tuition_estimate: enriched.tuition_estimate || prev.tuition_estimate,
                    acceptance_rate: enriched.acceptance_rate || prev.acceptance_rate,
                    rank: enriched.rank || prev.rank,
                    domain: enriched.domain || prev.domain
                }));

                // Store cache metadata if present
                if (enriched._cache_meta) {
                    setCacheMetadata(enriched._cache_meta);
                }
            }
        } catch (err) {
            console.error(err);
            setEnrichError("Failed to connect to AI service.");
        } finally {
            setIsEnriching(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // 1. Add university to database (or get existing)
            const uniResponse = await api.post('/api/universities/manual', formData);
            const university = uniResponse.data.university;

            // 2. Add to user's shortlist (this will trigger AI analysis)
            const shortlistResponse = await api.post('/api/shortlist', {
                university_id: university.id,
                category: 'TARGET' // Default category
            });

            // 3. Notify parent
            onAdd(shortlistResponse.data.shortlist_item);
            onClose();

            // Optional: Show success message/toast here
            alert("University added to your shortlist! AI is analyzing your profile fit...");
        } catch (err) {
            console.error(err);
            if (err.response?.status === 409) {
                alert("This university is already in your shortlist!");
            } else {
                alert("Failed to add university: " + (err.response?.data?.error?.message || err.message));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1a1f2e] border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white">AI-Powered University Search</h2>
                        <p className="text-sm text-gray-400">Can't find it in search? Add it here.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Core Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">University Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                                    placeholder="e.g. Oxford University"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Country *</label>
                                <input
                                    type="text"
                                    name="country"
                                    required
                                    value={formData.country}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                                    placeholder="e.g. United Kingdom"
                                />
                            </div>

                            {/* AI Enrich Button */}
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handleEnrich}
                                    disabled={isEnriching || !formData.name || !formData.country}
                                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isEnriching ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Enriching with AI...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                            </svg>
                                            Auto-Fill using AI
                                        </>
                                    )}
                                </button>
                                {enrichError && (
                                    <p className="text-red-400 text-xs mt-2 text-center">{enrichError}</p>
                                )}

                                {/* Cache Metadata Display */}
                                {cacheMetadata && (
                                    <div className="mt-3 p-3 bg-gray-900/50 border border-gray-700 rounded-lg">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded ${cacheMetadata.cached ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'
                                                    }`}>
                                                    {cacheMetadata.cached ? '✓ Cached' : '⚡ AI Generated'}
                                                </span>
                                                <span className="text-gray-400">
                                                    Confidence: <span className="font-bold text-white">{Math.round(cacheMetadata.confidence_score * 100)}%</span>
                                                </span>
                                            </div>
                                            {cacheMetadata.is_verified && (
                                                <span className="px-2 py-1 bg-purple-900/50 text-purple-400 rounded">
                                                    ✓ Verified
                                                </span>
                                            )}
                                        </div>
                                        {cacheMetadata.source && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Source: {cacheMetadata.source}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Website (Domain)</label>
                                <input
                                    type="text"
                                    name="domain"
                                    value={formData.domain}
                                    onChange={handleChange}
                                    placeholder="example.edu"
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Tuition ($/yr)</label>
                                    <input
                                        type="number"
                                        name="tuition_estimate"
                                        value={formData.tuition_estimate}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Rank</label>
                                    <input
                                        type="number"
                                        name="rank"
                                        value={formData.rank}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Acceptance Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    name="acceptance_rate"
                                    value={formData.acceptance_rate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end pt-4 border-t border-gray-700 gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/30 transition-all font-medium disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : 'Add to Shortlist'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
