import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const ProfileContext = createContext({});

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error('useProfile must be used within ProfileProvider');
    }
    return context;
};

export const ProfileProvider = ({ children }) => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [strength, setStrength] = useState(null);
    const [loading, setLoading] = useState(true);
    const [locks, setLocks] = useState([]);
    const [tasks, setTasks] = useState([]);

    // Fetch profile
    const fetchProfile = async () => {
        if (!user) {
            setProfile(null);
            setStrength(null);
            setLoading(false);
            return;
        }

        try {
            const response = await api.get('/api/profile');
            setProfile(response.data.profile);
            setStrength(response.data.strength);
        } catch (error) {
            if (error.response?.status === 404) {
                // Profile doesn't exist yet
                setProfile(null);
                setStrength(null);
            } else {
                console.error('Failed to fetch profile:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    // Fetch locks
    const fetchLocks = async () => {
        if (!user) return;

        try {
            const response = await api.get('/api/lock');
            setLocks(response.data.locks || []);
        } catch (error) {
            console.error('Failed to fetch locks:', error);
        }
    };

    // Fetch tasks
    const fetchTasks = async () => {
        if (!user) return;

        try {
            const response = await api.get('/api/tasks');
            setTasks(response.data.tasks || []);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        }
    };

    useEffect(() => {
        if (user) {
            // Only set loading if we don't already have a profile for this user
            // This prevents "flashing" on tab focus/token refresh
            if (!profile || profile.user_id !== user.id) {
                setLoading(true);
            }
        }
        fetchProfile();
        fetchLocks();
        fetchTasks();
    }, [user?.id]);

    // Calculate current stage
    const getStage = () => {
        if (!profile || !profile.profile_complete) return 1; // Building Profile
        if (locks.length === 0) {
            // Check if has shortlist (simplified - assume stage 2 or 3)
            return 2; // Discovering Universities
        }

        // Check if all tasks are completed
        const incompleteTasks = tasks.filter(t => t.status !== 'DONE');
        if (tasks.length > 0 && incompleteTasks.length === 0) {
            return 5; // All applications complete!
        }

        return 4; // Preparing Applications
    };

    const updateProfile = async (data) => {
        try {
            const response = await api.post('/api/profile', data);
            setProfile(response.data.profile);
            setStrength(response.data.strength);
            return response.data;
        } catch (error) {
            throw error;
        }
    };

    const value = {
        profile,
        strength,
        loading,
        locks,
        tasks,
        stage: getStage(),
        fetchProfile,
        fetchLocks,
        refreshLocks: fetchLocks, // Alias for immediate refresh
        refreshTasks: fetchTasks,
        updateProfile
    };

    return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};
