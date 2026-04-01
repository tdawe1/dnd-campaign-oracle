import { useState, useEffect } from 'react';
import { client } from '../lib/client';

interface Campaign {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
}

export function useCampaigns() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                const response = await (client as any).api.campaigns.$get();
                if (response.ok) {
                    const data = await response.json();
                    setCampaigns(data.campaigns || []);
                }
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch campaigns'));
            } finally {
                setLoading(false);
            }
        };

        fetchCampaigns();
    }, []);

    return { campaigns, loading, error };
}
