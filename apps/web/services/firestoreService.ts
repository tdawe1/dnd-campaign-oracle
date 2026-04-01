import { getFirestore, doc, setDoc, getDoc, collection } from "firebase/firestore";
import { app, auth } from "../firebaseConfig";
import { CampaignData } from "../types";

const db = getFirestore(app);

// Use a fixed appId to match the security rules structure
const APP_ID = "campaign-oracle";

export const FirestoreService = {
    /**
     * Save campaign data to the user's private collection.
     * Path: personalData/{appId}/users/{userId}/campaigns/{campaignId}
     */
    async saveCampaignData(campaignId: string, data: CampaignData): Promise<void> {
        const user = auth.currentUser;
        if (!user) throw new Error("User must be authenticated to save data.");

        try {
            const userDocRef = doc(db, "personalData", APP_ID, "users", user.uid, "campaigns", campaignId);
            await setDoc(userDocRef, data);
            console.log("Campaign data saved successfully.");
        } catch (error) {
            console.error("Error saving campaign data:", error);
            throw error;
        }
    },

    /**
     * Load campaign data from the user's private collection.
     * Path: personalData/{appId}/users/{userId}/campaigns/{campaignId}
     */
    async loadCampaignData(campaignId: string): Promise<CampaignData | null> {
        const user = auth.currentUser;
        if (!user) throw new Error("User must be authenticated to load data.");

        try {
            const userDocRef = doc(db, "personalData", APP_ID, "users", user.uid, "campaigns", campaignId);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                return docSnap.data() as CampaignData;
            } else {
                console.log("No such campaign found!");
                return null;
            }
        } catch (error) {
            console.error("Error loading campaign data:", error);
            throw error;
        }
    }
};
