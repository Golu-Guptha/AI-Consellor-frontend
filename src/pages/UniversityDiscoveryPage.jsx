import { useState, useEffect } from 'react';
import NavigationLayout from '../components/NavigationLayout';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AddUniversityModal from '../components/AddUniversityModal';
import UniversityAnalysisModal from '../components/UniversityAnalysisModal';

export default function UniversityDiscoveryPage() {
    // Initialize state from sessionStorage if available
    const [searchParams, setSearchParams] = useState(() => {
        const saved = sessionStorage.getItem('discovery_searchParams');
        return saved ? JSON.parse(saved) : {
            name: '',
            country: '',
            minTuition: '',
            maxTuition: ''
        };
    });
    const [universities, setUniversities] = useState(() => {
        const saved = sessionStorage.getItem('discovery_universities');
        return saved ? JSON.parse(saved) : [];
    });
    const [searched, setSearched] = useState(() => {
        return sessionStorage.getItem('discovery_searched') === 'true';
    });

    const [loading, setLoading] = useState(false);
    const [loadingStage, setLoadingStage] = useState(''); // New: track loading stage
    const [error, setError] = useState('');
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [selectedUniversity, setSelectedUniversity] = useState(null);

    // Save state to sessionStorage whenever it changes
    useEffect(() => {
        sessionStorage.setItem('discovery_searchParams', JSON.stringify(searchParams));
    }, [searchParams]);

    useEffect(() => {
        sessionStorage.setItem('discovery_universities', JSON.stringify(universities));
    }, [universities]);

    useEffect(() => {
        sessionStorage.setItem('discovery_searched', searched);
    }, [searched]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchParams.name && !searchParams.country) {
            setError('Please enter university name or country');
            return;
        }

        setLoading(true);
        setLoadingStage('🔍 Searching universities...');
        setError('');
        setSearched(true);

        try {
            const params = {};
            if (searchParams.name) params.name = searchParams.name;
            if (searchParams.country) params.country = searchParams.country;
            if (searchParams.minTuition) params.minTuition = searchParams.minTuition;
            if (searchParams.maxTuition) params.maxTuition = searchParams.maxTuition;

            // 1. Search for universities
            const response = await api.get('/api/universities/search', { params });
            const searchResults = response.data.universities || [];
            setUniversities(searchResults);
            console.log('Search Results:', searchResults.map(u => ({ id: u.id, name: u.name })));

        } catch (err) {
            const errorMessage = err.response?.data?.error?.message || err.message || 'Search failed';
            setError(`Search failed: ${errorMessage}. The external university API may be temporarily unavailable.`);
        } finally {
            setLoading(false);
            setLoadingStage('');
        }
    };

    const handleAnalyzeUniversity = async (uni) => {
        // If already analyzed, just open modal
        if (uni.ai_analysis) {
            setSelectedUniversity(uni);
            return;
        }

        // Otherwise, analyze on demand
        try {
            // Optimistic update to show loading state on button
            setUniversities(prev => prev.map(u =>
                u.id === uni.id ? { ...u, isAnalyzing: true } : u
            ));

            const response = await api.get(`/api/discovery/analyze/${uni.id}`);
            const analysis = response.data.analysis;

            // Update university with analysis data
            const updatedUni = { ...uni, ai_analysis: analysis, isAnalyzing: false };

            setUniversities(prev => prev.map(u =>
                u.id === uni.id ? updatedUni : u
            ));

            // Open modal with new data
            setSelectedUniversity(updatedUni);

        } catch (err) {
            console.error('Analysis failed:', err);
            const errorMsg = err.response?.data?.message || err.message || 'Analysis failed';
            alert(`Failed to analyze university: ${errorMsg}`);
            setUniversities(prev => prev.map(u =>
                u.id === uni.id ? { ...u, isAnalyzing: false } : u
            ));
        }
    };

    const handleAddToShortlist = async (universityId, category = 'TARGET') => {
        try {
            await api.post('/api/shortlist', { university_id: universityId, category });
            alert(`Added to ${category} list!`);
        } catch (err) {
            alert(err.response?.data?.error?.message || 'Failed to add');
        }
    };

    // Listen for "Add to Shortlist" from Modal
    useEffect(() => {
        const handleModalAdd = (e) => {
            const uni = e.detail;
            // Use AI recommendation if available, otherwise default to TARGET
            const recommendedCategory = uni.ai_analysis?.acceptance_score?.category?.toUpperCase() || 'TARGET';

            // Ensure valid category
            const validCategories = ['DREAM', 'TARGET', 'SAFE'];
            const finalCategory = validCategories.includes(recommendedCategory) ? recommendedCategory : 'TARGET';

            handleAddToShortlist(uni.id, finalCategory);
        };

        window.addEventListener('add-to-shortlist', handleModalAdd);
        return () => window.removeEventListener('add-to-shortlist', handleModalAdd);
    }, []);

    return (
        <NavigationLayout>
            <div className="p-8">
                <div className="container mx-auto max-w-7xl py-8">
                    <h1 className="text-3xl font-bold mb-6">🔍 Discover Universities</h1>

                    {/* Search Form */}
                    <div className="card mb-8">
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">University Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={searchParams.name}
                                        onChange={(e) => setSearchParams({ ...searchParams, name: e.target.value })}
                                        placeholder="e.g., Stanford"
                                    />
                                </div>
                                <div>
                                    <label className="label">Country</label>
                                    <input
                                        type="text"
                                        className="input"
                                        list="countries"
                                        value={searchParams.country}
                                        onChange={(e) => setSearchParams({ ...searchParams, country: e.target.value })}
                                        placeholder="e.g., United States, India, UK"
                                    />
                                    <datalist id="countries">
                                        <option value="United States" />
                                        <option value="United Kingdom" />
                                        <option value="Canada" />
                                        <option value="Australia" />
                                        <option value="India" />
                                        <option value="Germany" />
                                        <option value="France" />
                                        <option value="Netherlands" />
                                        <option value="Singapore" />
                                        <option value="Ireland" />
                                        <option value="New Zealand" />
                                        <option value="China" />
                                        <option value="Japan" />
                                        <option value="South Korea" />
                                        <option value="Switzerland" />
                                        <option value="Sweden" />
                                        <option value="Spain" />
                                        <option value="Italy" />
                                        <option value="Brazil" />
                                        <option value="Mexico" />
                                    </datalist>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Min Tuition (USD/year)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={searchParams.minTuition}
                                        onChange={(e) => setSearchParams({ ...searchParams, minTuition: e.target.value })}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div>
                                    <label className="label">Max Tuition (USD/year)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={searchParams.maxTuition}
                                        onChange={(e) => setSearchParams({ ...searchParams, maxTuition: e.target.value })}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4">
                                <button type="submit" className="btn btn-primary flex-1 md:flex-none md:w-48" disabled={loading}>
                                    {loading ? <span className="spinner"></span> : 'Search Universities'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsManualModalOpen(true)}
                                    className="btn btn-outline flex-1 md:flex-none"
                                >
                                    🔍 Search with AI
                                </button>
                            </div>
                        </form>
                    </div>

                    {error && (
                        <div className="mb-6 bg-[hsl(var(--color-error))]/10 border border-[hsl(var(--color-error))]/30 text-[hsl(var(--color-error))] p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Results */}
                    {loading && <LoadingSpinner message={loadingStage || "Searching universities..."} />}

                    {!loading && searched && universities.length === 0 && (
                        <div className="card text-center py-12">
                            <div className="text-5xl mb-4">🔍</div>
                            <h3 className="text-xl font-bold mb-2">No universities found</h3>
                            <p className="text-[hsl(var(--color-text-muted))]">
                                Try adjusting your search criteria
                            </p>
                        </div>
                    )}

                    {!loading && universities.length > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">{universities.length} universities found</h2>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {universities.map((uni) => (
                                    <div key={uni.id} className="card card-hover">
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-lg line-clamp-2">{uni.name}</h3>
                                        </div>

                                        {/* AI-Powered Personalized Badges - Show ONLY if analysis exists */}
                                        {uni.ai_analysis && uni.ai_analysis.cost_level && uni.ai_analysis.risk_level && uni.ai_analysis.acceptance_score && (
                                            <div className="flex flex-wrap gap-2 mb-4 animate-in fade-in zoom-in duration-300">
                                                {/* Cost Badge */}
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${uni.ai_analysis.cost_level === 'low'
                                                    ? 'bg-green-500/20 text-green-600'
                                                    : uni.ai_analysis.cost_level === 'high'
                                                        ? 'bg-red-500/20 text-red-600'
                                                        : 'bg-yellow-500/20 text-yellow-600'
                                                    }`}>
                                                    💰 {uni.ai_analysis.cost_level?.charAt(0).toUpperCase() + uni.ai_analysis.cost_level?.slice(1)} Cost
                                                </span>

                                                {/* Acceptance Badge */}
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${uni.ai_analysis.acceptance_score?.category === 'SAFE'
                                                    ? 'bg-green-500/20 text-green-600'
                                                    : uni.ai_analysis.acceptance_score?.category === 'DREAM'
                                                        ? 'bg-purple-500/20 text-purple-600'
                                                        : 'bg-blue-500/20 text-blue-600'
                                                    }`}>
                                                    🎯 {uni.ai_analysis.acceptance_score?.percentage}% - {uni.ai_analysis.acceptance_score?.category}
                                                </span>

                                                {/* Risk Badge */}
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${uni.ai_analysis.risk_level === 'low'
                                                    ? 'bg-green-500/20 text-green-600'
                                                    : uni.ai_analysis.risk_level === 'high'
                                                        ? 'bg-red-500/20 text-red-600'
                                                        : 'bg-yellow-500/20 text-yellow-600'
                                                    }`}>
                                                    ⚠️ {uni.ai_analysis.risk_level?.charAt(0).toUpperCase() + uni.ai_analysis.risk_level?.slice(1)} Risk
                                                </span>
                                            </div>
                                        )}

                                        <div className="space-y-2 text-sm mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[hsl(var(--color-text-muted))]">📍</span>
                                                <span>{uni.country}</span>
                                            </div>

                                            {uni.tuition_estimate && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[hsl(var(--color-text-muted))]">💰</span>
                                                    <span>${uni.tuition_estimate?.toLocaleString()}/year</span>
                                                </div>
                                            )}

                                            {uni.acceptance_rate && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[hsl(var(--color-text-muted))]">📊</span>
                                                    <span>{uni.acceptance_rate}% acceptance rate</span>
                                                </div>
                                            )}

                                            {uni.rank && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[hsl(var(--color-text-muted))]">🏆</span>
                                                    <span>Rank #{uni.rank}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* REMOVED OLD MATCH SCORE UI */}

                                        {/* Actions */}
                                        <button
                                            onClick={() => {
                                                if (!uni.id) {
                                                    alert('Error: University ID is missing. Please refresh and try again.');
                                                    return;
                                                }
                                                handleAnalyzeUniversity(uni);
                                            }}
                                            disabled={uni.isAnalyzing}
                                            className={`btn w-full mb-2 text-sm ${uni.ai_analysis ? 'btn-outline' : 'btn-primary'}`}
                                        >
                                            {uni.isAnalyzing ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <span className="spinner w-4 h-4"></span> Using AI to check compatibility...
                                                </span>
                                            ) : uni.ai_analysis ? (
                                                '📊 View Match Analysis'
                                            ) : (
                                                '🤖 Analyze Compatibility'
                                            )}
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAddToShortlist(uni.id, 'DREAM')}
                                                className="btn btn-ghost text-xs flex-1"
                                                title="Add as Dream"
                                            >
                                                🌟 Dream
                                            </button>
                                            <button
                                                onClick={() => handleAddToShortlist(uni.id, 'TARGET')}
                                                className="btn btn-ghost text-xs flex-1"
                                                title="Add as Target"
                                            >
                                                🎯 Target
                                            </button>
                                            <button
                                                onClick={() => handleAddToShortlist(uni.id, 'SAFE')}
                                                className="btn btn-ghost text-xs flex-1"
                                                title="Add as Safe"
                                            >
                                                ✅ Safe
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!searched && (
                        <div className="card text-center py-12">
                            <div className="text-5xl mb-4">🎓</div>
                            <h3 className="text-xl font-bold mb-2">Search 17,000+ Universities</h3>
                            <p className="text-[hsl(var(--color-text-muted))]">
                                Enter a university name or country to get started
                            </p>
                        </div>
                    )}
                    {/* Manual Add Modal */}
                    <AddUniversityModal
                        isOpen={isManualModalOpen}
                        onClose={() => setIsManualModalOpen(false)}
                        onAdd={(newUni) => {
                            setUniversities(prev => [newUni, ...prev]);
                            alert(`${newUni.university?.name || 'University'} added successfully!`);
                        }}
                    />

                    {/* Analysis Modal */}
                    {selectedUniversity && (
                        <UniversityAnalysisModal
                            university={selectedUniversity}
                            onClose={() => setSelectedUniversity(null)}
                        />
                    )}
                </div>
            </div>
        </NavigationLayout>
    );
}
