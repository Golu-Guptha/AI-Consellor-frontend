import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import NavigationLayout from '../components/NavigationLayout';
import LoadingSpinner from '../components/LoadingSpinner';

const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands', 'Singapore', 'Ireland', 'New Zealand'];
const EDUCATION_LEVELS = ['HS', 'Bachelors', 'Masters', 'MBA', 'PhD'];
const TARGET_DEGREES = ['Bachelors', 'Masters', 'MBA', 'PhD'];
const FUNDING_PLANS = ['Self-Funded', 'Scholarship', 'Loan', 'Mixed'];

export default function ProfileEditPage() {
    const navigate = useNavigate();
    const { profile, updateProfile, fetchProfile } = useProfile();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        education_level: '',
        degree_major: '',
        grad_year: new Date().getFullYear(),
        gpa: '',
        target_degree: '',
        field_of_study: '',
        intake_year: new Date().getFullYear() + 1,
        preferred_countries: [],
        budget_min: '',
        budget_max: '',
        funding_plan: '',
        ielts_score: '',
        toefl_score: '',
        gre_score: '',
        gmat_score: '',
        sop_status: 'NOT_STARTED'
    });

    useEffect(() => {
        const loadProfile = async () => {
            await fetchProfile();
            setLoading(false);
        };
        loadProfile();
    }, []);

    useEffect(() => {
        if (profile) {
            setFormData({
                education_level: profile.education_level || '',
                degree_major: profile.degree_major || '',
                grad_year: profile.grad_year || new Date().getFullYear(),
                gpa: profile.gpa || '',
                target_degree: profile.target_degree || '',
                field_of_study: profile.field_of_study || '',
                intake_year: profile.intake_year || new Date().getFullYear() + 1,
                preferred_countries: profile.preferred_countries || [],
                budget_min: profile.budget_min || '',
                budget_max: profile.budget_max || '',
                funding_plan: profile.funding_plan || '',
                ielts_score: profile.ielts_score || '',
                toefl_score: profile.toefl_score || '',
                gre_score: profile.gre_score || '',
                gmat_score: profile.gmat_score || '',
                sop_status: profile.sop_status || 'NOT_STARTED'
            });
        }
    }, [profile]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCountryToggle = (country) => {
        setFormData(prev => ({
            ...prev,
            preferred_countries: prev.preferred_countries.includes(country)
                ? prev.preferred_countries.filter(c => c !== country)
                : [...prev.preferred_countries, country]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess(false);

        try {
            const profileData = {
                ...formData,
                gpa: formData.gpa ? parseFloat(formData.gpa) : null,
                budget_min: formData.budget_min ? parseInt(formData.budget_min) : null,
                budget_max: formData.budget_max ? parseInt(formData.budget_max) : null,
                ielts_score: formData.ielts_score ? parseFloat(formData.ielts_score) : null,
                toefl_score: formData.toefl_score ? parseInt(formData.toefl_score) : null,
                gre_score: formData.gre_score ? parseInt(formData.gre_score) : null,
                gmat_score: formData.gmat_score ? parseInt(formData.gmat_score) : null,
            };

            await updateProfile(profileData);
            setSuccess(true);
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleBack = async () => {
        // Optionally save before going back
        if (window.confirm('Save changes before going back?')) {
            await handleSubmit(new Event('submit'));
        } else {
            navigate('/dashboard');
        }
    };

    if (loading) {
        return <LoadingSpinner fullScreen message="Loading profile..." />;
    }

    return (
        <NavigationLayout showBackButton onBack={handleBack}>
            <div className="p-8">
                <div className="container mx-auto max-w-4xl py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl font-bold">Edit Profile</h1>
                        <Link to="/dashboard" className="btn btn-ghost">
                            Cancel
                        </Link>
                    </div>

                    {error && (
                        <div className="mb-6 bg-[hsl(var(--color-error))]/10 border border-[hsl(var(--color-error))]/30 text-[hsl(var(--color-error))] p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 bg-[hsl(var(--color-success))]/10 border border-[hsl(var(--color-success))]/30 text-[hsl(var(--color-success))] p-4 rounded-lg">
                            Profile updated! AI is re-analyzing your university shortlist matches...
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Academic Background */}
                        <div className="card">
                            <h2 className="text-xl font-bold mb-6">📚 Academic Background</h2>
                            <div className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Education Level</label>
                                        <select className="input" value={formData.education_level} onChange={(e) => handleChange('education_level', e.target.value)}>
                                            <option value="">Select...</option>
                                            {EDUCATION_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Degree/Major</label>
                                        <input type="text" className="input" value={formData.degree_major} onChange={(e) => handleChange('degree_major', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Graduation Year</label>
                                        <input type="number" className="input" value={formData.grad_year} onChange={(e) => handleChange('grad_year', parseInt(e.target.value))} />
                                    </div>
                                    <div>
                                        <label className="label">GPA (out of 4.0)</label>
                                        <input type="number" className="input" value={formData.gpa} onChange={(e) => handleChange('gpa', e.target.value)} step="0.01" min="0" max="4" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Study Goals */}
                        <div className="card">
                            <h2 className="text-xl font-bold mb-6">🎯 Study Goals</h2>
                            <div className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Target Degree</label>
                                        <select className="input" value={formData.target_degree} onChange={(e) => handleChange('target_degree', e.target.value)}>
                                            <option value="">Select...</option>
                                            {TARGET_DEGREES.map(degree => <option key={degree} value={degree}>{degree}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Field of Study</label>
                                        <input type="text" className="input" value={formData.field_of_study} onChange={(e) => handleChange('field_of_study', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Intake Year</label>
                                    <input type="number" className="input" value={formData.intake_year} onChange={(e) => handleChange('intake_year', parseInt(e.target.value))} />
                                </div>
                                <div>
                                    <label className="label">Preferred Countries</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                                        {COUNTRIES.map(country => (
                                            <button key={country} type="button" onClick={() => handleCountryToggle(country)}
                                                className={`px-4 py-2 rounded-lg text-sm border transition-all ${formData.preferred_countries.includes(country) ? 'bg-[hsl(var(--color-primary))]/20 border-[hsl(var(--color-primary))] text-[hsl(var(--color-primary))]' : 'bg-[hsl(var(--color-bg))] border-[hsl(var(--color-border))] hover:border-[hsl(var(--color-primary))]/50'}`}>
                                                {country}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Budget & Tests */}
                        <div className="grid lg:grid-cols-2 gap-6">
                            <div className="card">
                                <h2 className="text-xl font-bold mb-6">💰 Budget</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="label">Min Budget (USD/year)</label>
                                        <input type="number" className="input" value={formData.budget_min} onChange={(e) => handleChange('budget_min', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="label">Max Budget (USD/year)</label>
                                        <input type="number" className="input" value={formData.budget_max} onChange={(e) => handleChange('budget_max', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="label">Funding Plan</label>
                                        <select className="input" value={formData.funding_plan} onChange={(e) => handleChange('funding_plan', e.target.value)}>
                                            <option value="">Select...</option>
                                            {FUNDING_PLANS.map(plan => <option key={plan} value={plan}>{plan}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <h2 className="text-xl font-bold mb-6">📝 Test Scores</h2>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="label text-xs">IELTS</label>
                                            <input type="number" className="input" value={formData.ielts_score} onChange={(e) => handleChange('ielts_score', e.target.value)} step="0.5" min="0" max="9" />
                                        </div>
                                        <div>
                                            <label className="label text-xs">TOEFL</label>
                                            <input type="number" className="input" value={formData.toefl_score} onChange={(e) => handleChange('toefl_score', e.target.value)} min="0" max="120" />
                                        </div>
                                        <div>
                                            <label className="label text-xs">GRE</label>
                                            <input type="number" className="input" value={formData.gre_score} onChange={(e) => handleChange('gre_score', e.target.value)} min="260" max="340" />
                                        </div>
                                        <div>
                                            <label className="label text-xs">GMAT</label>
                                            <input type="number" className="input" value={formData.gmat_score} onChange={(e) => handleChange('gmat_score', e.target.value)} min="200" max="800" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">SOP Status</label>
                                        <select className="input" value={formData.sop_status} onChange={(e) => handleChange('sop_status', e.target.value)}>
                                            <option value="NOT_STARTED">Not Started</option>
                                            <option value="DRAFT">Draft</option>
                                            <option value="READY">Ready</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end gap-4">
                            <Link to="/dashboard" className="btn btn-secondary">
                                Cancel
                            </Link>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? <span className="spinner"></span> : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </NavigationLayout>
    );
}
