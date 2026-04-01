import { CampaignData, Notification } from '../types';

export const MOCK_NOTIFICATIONS: Notification[] = [
    { id: 'n1', title: 'Session Analyzed', message: 'The transcript for "The Goblin Ambush" has been processed.', date: '2 mins ago', read: false, type: 'ai' },
    { id: 'n2', title: 'Quest Updated', message: 'Kaelen completed "Rat Problem".', date: '1 hour ago', read: false, type: 'success' },
    { id: 'n3', title: 'New Feature', message: 'Oracle Chat is now available for DMs.', date: '1 day ago', read: true, type: 'info' }
];

export const INITIAL_DATA: CampaignData = {
    title: "New Campaign",
    dmUserId: "",
    party: [],
    quests: [],
    npcs: [],
    sessions: [],
    items: []
};
