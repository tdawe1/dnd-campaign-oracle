import "dotenv/config";
import { db } from "./index";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

interface TransformedData {
    users: any[];
    campaigns: any[];
    campaignMembers: any[];
    characters: any[];
    quests: any[];
    npcs: any[];
    sessionLogs: any[];
}

const seed = async () => {
    console.log("🌱 Starting data import...");

    // 1. Get the current authenticated user (the first real user in DB)
    const existingUsers = await db.select().from(schema.users).limit(1);
    if (existingUsers.length === 0) {
        console.error("❌ No authenticated user found in database. Please log in first.");
        process.exit(1);
    }
    const currentUser = existingUsers[0];
    console.log(`📋 Target user: ${currentUser.email} (${currentUser.id})`);

    // 2. Load transformed data
    const dataPath = path.resolve(process.cwd(), "../../transformed_data.json");
    console.log(`📂 Loading data from: ${dataPath}`);
    
    if (!fs.existsSync(dataPath)) {
        console.error(`❌ File not found: ${dataPath}`);
        process.exit(1);
    }
    
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const data: TransformedData = JSON.parse(rawData);

    console.log(`📊 Found: ${data.campaigns?.length || 0} campaigns, ${data.characters?.length || 0} characters, ${data.sessionLogs?.length || 0} sessions`);

    // 3. Clear existing data (optional - comment out if you want to append)
    console.log("🧹 Clearing existing campaign data...");
    await db.delete(schema.sessionLoot);
    await db.delete(schema.sessionCombat);
    await db.delete(schema.sessionLogs);
    await db.delete(schema.npcs);
    await db.delete(schema.quests);
    await db.delete(schema.characters);
    await db.delete(schema.campaignMembers);
    await db.delete(schema.campaigns);
    // Don't delete users - we need the authenticated user

    // 4. Create old-to-new user ID mapping
    // All old user IDs will map to current user
    const oldUserIds = new Set<string>();
    data.users?.forEach(u => oldUserIds.add(u.id));
    data.campaigns?.forEach(c => oldUserIds.add(c.dmUserId));
    data.campaignMembers?.forEach(m => oldUserIds.add(m.userId));
    data.characters?.forEach(ch => oldUserIds.add(ch.ownerId));

    const userIdMap = new Map<string, string>();
    oldUserIds.forEach(oldId => userIdMap.set(oldId, currentUser.id));
    console.log(`🔄 Mapping ${userIdMap.size} old user IDs → ${currentUser.id}`);

    // 5. Insert campaigns
    const campaignIdMap = new Map<string, string>();
    if (data.campaigns?.length) {
        for (const campaign of data.campaigns) {
            const [inserted] = await db.insert(schema.campaigns).values({
                dmUserId: currentUser.id,
                title: campaign.title,
                description: campaign.description,
                currentSessionDate: campaign.currentSessionDate || null,
                isActive: campaign.isActive ?? true,
            }).returning();
            campaignIdMap.set(campaign.id, inserted.id);
            console.log(`  ✅ Campaign: ${campaign.title}`);
        }
    }

    // 6. Insert campaign members (just add current user as DM)
    for (const [oldCampaignId, newCampaignId] of campaignIdMap) {
        await db.insert(schema.campaignMembers).values({
            campaignId: newCampaignId,
            userId: currentUser.id,
            role: "dm",
        });
    }
    console.log(`  ✅ Added current user as DM to ${campaignIdMap.size} campaigns`);

    // 7. Insert characters
    if (data.characters?.length) {
        for (const char of data.characters) {
            const newCampaignId = campaignIdMap.get(char.campaignId);
            if (!newCampaignId) {
                console.warn(`  ⚠️ Skipping character ${char.name}: campaign not found`);
                continue;
            }
            await db.insert(schema.characters).values({
                campaignId: newCampaignId,
                ownerId: currentUser.id,
                name: char.name,
                playerName: char.playerName,
                characterClass: char.characterClass,
                level: char.level ?? 1,
                hp: char.hp ?? 0,
                maxHp: char.maxHp ?? 0,
                ac: char.ac ?? 10,
                status: char.status || "active",
                notes: char.notes,
                avatarUrl: char.avatarUrl,
                isActive: char.isActive ?? true,
            });
        }
        console.log(`  ✅ Imported ${data.characters.length} characters`);
    }

    // 8. Insert quests
    if (data.quests?.length) {
        for (const quest of data.quests) {
            const newCampaignId = campaignIdMap.get(quest.campaignId);
            if (!newCampaignId) continue;
            await db.insert(schema.quests).values({
                campaignId: newCampaignId,
                questType: quest.questType || "Side",
                title: quest.title,
                source: quest.source,
                description: quest.description,
                outcome: quest.outcome,
                status: quest.status || "active",
            });
        }
        console.log(`  ✅ Imported ${data.quests.length} quests`);
    }

    // 9. Insert NPCs
    if (data.npcs?.length) {
        for (const npc of data.npcs) {
            const newCampaignId = campaignIdMap.get(npc.campaignId);
            if (!newCampaignId) continue;
            await db.insert(schema.npcs).values({
                campaignId: newCampaignId,
                name: npc.name,
                location: npc.location,
                notes: npc.notes,
                imageUrl: npc.imageUrl,
                isActive: npc.isActive ?? true,
            });
        }
        console.log(`  ✅ Imported ${data.npcs.length} NPCs`);
    }

    // 10. Insert session logs with calculated dates
    const sessionIdMap = new Map<string, string>();
    if (data.sessionLogs?.length) {
        // Sort by session number to calculate dates correctly
        const sortedSessions = [...data.sessionLogs].sort((a, b) => 
            (a.sessionNumber || 0) - (b.sessionNumber || 0)
        );
        
        const baseDate = new Date("2024-01-01");
        
        for (const session of sortedSessions) {
            const newCampaignId = campaignIdMap.get(session.campaignId);
            if (!newCampaignId) continue;
            
            // Calculate sessionDate: base + (sessionNumber - 1) * 7 days
            let sessionDate: string;
            if (session.sessionDate) {
                sessionDate = session.sessionDate;
            } else {
                const sessionNum = session.sessionNumber || 1;
                const calculatedDate = new Date(baseDate);
                calculatedDate.setDate(calculatedDate.getDate() + (sessionNum - 1) * 7);
                sessionDate = calculatedDate.toISOString().split("T")[0];
            }
            
            const [inserted] = await db.insert(schema.sessionLogs).values({
                campaignId: newCampaignId,
                sessionNumber: session.sessionNumber,
                title: session.title || `Session ${session.sessionNumber || "Unknown"}`,
                sessionDate: sessionDate,
                location: session.location,
                journalEntry: session.journalEntry,
                transcript: session.transcript,
                audioUrl: session.audioUrl,
            }).returning();
            
            sessionIdMap.set(session.id, inserted.id);
        }
        console.log(`  ✅ Imported ${data.sessionLogs.length} session logs`);
    }

    console.log("\n🎉 Data import complete!");
    console.log(`   Campaigns: ${campaignIdMap.size}`);
    console.log(`   Characters: ${data.characters?.length || 0}`);
    console.log(`   Quests: ${data.quests?.length || 0}`);
    console.log(`   NPCs: ${data.npcs?.length || 0}`);
    console.log(`   Sessions: ${sessionIdMap.size}`);

    process.exit(0);
};

seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
