import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) {
            navigate('/onboarding');
        }
    }, [user, loading, navigate]);

    if (loading) {
        return <div className="min-h-screen bg-[hsl(var(--color-bg))] flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--color-bg))] via-[hsl(var(--color-bg-secondary))] to-[hsl(var(--color-bg))]">
            {/* Hero Section */}
            <div className="container mx-auto px-4 py-20">
                <div className="max-w-4xl mx-auto text-center animate-slide-up">
                    <h1 className="text-6xl font-bold mb-6">
                        Your <span className="gradient-text">AI-Powered</span> Study Abroad Journey
                    </h1>
                    <p className="text-xl text-[hsl(var(--color-text-muted))] mb-8 max-w-2xl mx-auto">
                        From confusion to clarity. Let our AI counsellor guide you through university selection,
                        applications, and everything in between.
                    </p>

                    <div className="flex gap-4 justify-center">
                        <Link to="/signup" className="btn btn-primary text-lg px-8">
                            Get Started Free
                        </Link>
                        <Link to="/login" className="btn btn-secondary text-lg px-8">
                            Login
                        </Link>
                    </div>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-3 gap-8 mt-20">
                    <div className="card card-hover text-center">
                        <div className="text-4xl mb-4">🤖</div>
                        <h3 className="text-xl font-bold mb-2">AI Counsellor</h3>
                        <p className="text-[hsl(var(--color-text-muted))]">
                            Get personalized guidance with voice or text. AI takes actions for you.
                        </p>
                    </div>

                    <div className="card card-hover text-center">
                        <div className="text-4xl mb-4">🎓</div>
                        <h3 className="text-xl font-bold mb-2">Real University Data</h3>
                        <p className="text-[hsl(var(--color-text-muted))]">
                            Search 17,000+ universities with live data on tuition, acceptance rates, and rankings.
                        </p>
                    </div>

                    <div className="card card-hover text-center">
                        <div className="text-4xl mb-4">📊</div>
                        <h3 className="text-xl font-bold mb-2">Smart Matching</h3>
                        <p className="text-[hsl(var(--color-text-muted))]">
                            Calculate your acceptance likelihood based on GPA, test scores, and budget.
                        </p>
                    </div>
                </div>

                {/* How It Works */}
                <div className="mt-20 max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
                    <div className="space-y-6">
                        {[
                            { step: 1, title: 'Build Your Profile', desc: 'Tell us about your academic background, goals, and budget' },
                            { step: 2, title: 'Discover Universities', desc: 'Search and filter universities that match your profile' },
                            { step: 3, title: 'Lock Your Choices', desc: 'Commit to universities and unlock application guidance' },
                            { step: 4, title: 'Apply with Confidence', desc: 'Follow AI-generated tasks and timelines' }
                        ].map(({ step, title, desc }) => (
                            <div key={step} className="flex gap-4 items-start">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] flex items-center justify-center text-white font-bold">
                                    {step}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{title}</h3>
                                    <p className="text-[hsl(var(--color-text-muted))]">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center mt-20">
                    <Link to="/signup" className="btn btn-primary text-lg px-12">
                        Start Your Journey →
                    </Link>
                </div>
            </div>
        </div>
    );
}
