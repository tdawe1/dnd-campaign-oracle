import { describe, it, expect } from "vitest";
import {
    createCampaignSchema,
    createCharacterSchema,
    createSessionSchema,
    createQuestSchema,
    chatSchema
} from "./index";

describe("Schema Validation", () => {

    describe("Sanitization", () => {
        it("should sanitize inputs to prevent XSS", () => {
            const result = createCampaignSchema.parse({
                title: "<script>alert('xss')</script>"
            });
            expect(result.title).toBe("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
        });
    });

    describe("Campaign Schema", () => {
        it("should validate correct campaign", () => {
            expect(() => createCampaignSchema.parse({
                title: "Valid Campaign",
                description: "Description"
            })).not.toThrow();
        });

        it("should throw on empty title", () => {
            expect(() => createCampaignSchema.parse({
                title: ""
            })).toThrow();
        });
    });

    describe("Character Schema", () => {
        const validUnrefined = {
            campaignId: "123e4567-e89b-12d3-a456-426614174000",
            name: "Hero",
            hp: 10,
            maxHp: 20
        };

        it("should fail if hp > maxHp", () => {
            expect(() => createCharacterSchema.parse({
                ...validUnrefined,
                hp: 25,
                maxHp: 20
            })).toThrow("Current HP cannot exceed maximum HP");
        });

        it("should validate UUID format", () => {
            expect(() => createCharacterSchema.parse({
                ...validUnrefined,
                campaignId: "invalid-uuid"
            })).toThrow("Invalid campaign ID format");
        });
    });

    describe("Session Schema", () => {
        const validSession = {
            campaignId: "123e4567-e89b-12d3-a456-426614174000",
            title: "Session 1",
            sessionDate: new Date().toISOString()
        };

        it("should fail if date is in the future", () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);

            expect(() => createSessionSchema.parse({
                ...validSession,
                sessionDate: futureDate.toISOString()
            })).toThrow("Session date cannot be in the future");
        });

        it("should validate combat array size", () => {
            const combat = Array(51).fill({ enemyName: "Goblin" });
            expect(() => createSessionSchema.parse({
                ...validSession,
                combat
            })).toThrow("Combat encounters cannot exceed 50 entries");
        });
    });
});
