import { getDataConnect, DataConnect, connectDataConnectEmulator } from 'firebase/data-connect';
import { app } from '../../firebaseConfig';
import { connectorConfig } from '../../src/dataconnect-generated';
import * as sdk from '../../src/dataconnect-generated';

// Initialize Data Connect
let dataConnect: DataConnect;

try {
    dataConnect = getDataConnect(app, connectorConfig);
    // Connect to emulator if running locally
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        connectDataConnectEmulator(dataConnect, 'localhost', 9399);
    }
} catch (e) {
    console.error('Failed to initialize Data Connect:', e);
}

export class DataConnectService {
    // Campaigns
    static async getCampaignById(id: string) {
        const response = await sdk.getCampaignById(dataConnect, { id });
        return response.data.campaigns[0];
    }

    static async listCampaigns() {
        const response = await sdk.listCampaigns(dataConnect);
        return response.data.campaigns;
    }

    static async createCampaign(variables: sdk.CreateCampaignVariables) {
        const response = await sdk.createCampaign(dataConnect, variables);
        return response.data.campaign_insert;
    }

    static async updateCampaign(variables: sdk.UpdateCampaignVariables) {
        const response = await sdk.updateCampaign(dataConnect, variables);
        return response.data.campaign_update;
    }

    // Characters
    static async listCharactersByCampaign(campaignId: string) {
        const response = await sdk.listCharactersByCampaign(dataConnect, { campaignId });
        return response.data.characters;
    }

    static async createCharacter(variables: sdk.CreateCharacterVariables) {
        const response = await sdk.createCharacter(dataConnect, variables);
        return response.data.character_insert;
    }

    static async updateCharacter(variables: sdk.UpdateCharacterVariables) {
        const response = await sdk.updateCharacter(dataConnect, variables);
        return response.data.character_update;
    }

    static async deleteCharacter(id: string) {
        const response = await sdk.deleteCharacter(dataConnect, { id });
        return response.data.character_delete;
    }

    // Sessions
    static async getSessionById(id: string) {
        const response = await sdk.getSessionById(dataConnect, { id });
        return response.data.sessionLogs[0];
    }

    static async listSessionsByCampaign(campaignId: string) {
        const response = await sdk.listSessionsByCampaign(dataConnect, { campaignId });
        return response.data.sessionLogs;
    }

    static async createSession(variables: sdk.CreateSessionVariables) {
        const response = await sdk.createSession(dataConnect, variables);
        return response.data.sessionLog_insert;
    }

    static async updateSession(variables: sdk.UpdateSessionVariables) {
        const response = await sdk.updateSession(dataConnect, variables);
        return response.data.sessionLog_update;
    }

    static async deleteSession(id: string) {
        const response = await sdk.deleteSession(dataConnect, { id });
        return response.data.sessionLog_delete;
    }

    // Quests
    static async listQuestsByCampaign(campaignId: string) {
        const response = await sdk.listQuestsByCampaign(dataConnect, { campaignId });
        return response.data.quests;
    }

    static async createQuest(variables: sdk.CreateQuestVariables) {
        const response = await sdk.createQuest(dataConnect, variables);
        return response.data.quest_insert;
    }

    static async updateQuest(variables: sdk.UpdateQuestVariables) {
        const response = await sdk.updateQuest(dataConnect, variables);
        return response.data.quest_update;
    }

    static async deleteQuest(id: string) {
        const response = await sdk.deleteQuest(dataConnect, { id });
        return response.data.quest_delete;
    }

    // NPCs
    static async listNpcsByCampaign(campaignId: string) {
        const response = await sdk.listNpcsByCampaign(dataConnect, { campaignId });
        return response.data.npcs;
    }

    static async createNpc(variables: sdk.CreateNpcVariables) {
        const response = await sdk.createNpc(dataConnect, variables);
        return response.data.npc_insert;
    }

    static async updateNpc(variables: sdk.UpdateNpcVariables) {
        const response = await sdk.updateNpc(dataConnect, variables);
        return response.data.npc_update;
    }

    static async deleteNpc(id: string) {
        const response = await sdk.deleteNpc(dataConnect, { id });
        return response.data.npc_delete;
    }

    // Notifications
    static async listNotificationsByUser(userId: string) {
        const response = await sdk.listNotificationsByUser(dataConnect, { userId });
        return response.data.notifications;
    }

    static async createNotification(variables: sdk.CreateNotificationVariables) {
        const response = await sdk.createNotification(dataConnect, variables);
        return response.data.notification_insert;
    }

    static async markNotificationRead(id: string) {
        const response = await sdk.markNotificationRead(dataConnect, { id });
        return response.data.notification_update;
    }

    static async deleteNotification(id: string) {
        const response = await sdk.deleteNotification(dataConnect, { id });
        return response.data.notification_delete;
    }
}
