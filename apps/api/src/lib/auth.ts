import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema";

// Trusted origins for CORS - frontend and API origins
const trustedOrigins = [
    "http://localhost:3000",  // Frontend dev
    "http://localhost:3001",  // API (for same-origin requests)
    process.env.FRONTEND_URL, // Dynamic frontend URL (Cloudflare/ngrok)
    process.env.BETTER_AUTH_URL, // Dynamic auth URL
    process.env.BETTER_AUTH_TRUSTED_ORIGINS, // Additional trusted origins
].filter((origin): origin is string => !!origin && origin !== "");

export const auth = betterAuth({
    // Database adapter configuration
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications,
        },
    }),

    // User model customization
    user: {
        additionalFields: {
            displayName: {
                type: "string",
                required: false,
            },
            defaultRole: {
                type: "string",
                required: false,
                defaultValue: "player",
            },
            avatarUrl: {
                type: "string",
                required: false,
            },
            role: {
                type: "string",
                required: false,
                defaultValue: "guest",
            },
            oracleTokensUsed: {
                type: "number",
                required: false,
                defaultValue: 0,
            },
            oracleTokensResetAt: {
                type: "date",
                required: false,
            },
            inviteCode: {
                type: "string",
                required: false,
            }
        },
    },

    // Database hooks for invite code logic
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    // Check invite code - use ONLY env vars, no hardcoded fallbacks
                    const inviteCode = user.inviteCode;
                    const validCode = process.env.REGISTRATION_INVITE_CODE;
                    const dmCode = process.env.DM_INVITE_CODE;

                    if (dmCode && inviteCode === dmCode) {
                        console.log(`[Auth Hook] Upgrade to DM for invite code`);
                        return {
                            data: {
                                ...user,
                                role: "dm",
                            }
                        }
                    }

                    if (validCode && inviteCode === validCode) {
                        console.log(`[Auth Hook] Upgrade to player for invite code`);
                        return {
                            data: {
                                ...user,
                                role: "player",
                            }
                        }
                    }

                    return { data: user };
                },
                after: async (user) => {
                    // If user is a player or dm (upgraded via invite code), add to DM's campaign
                    if (user.role === "player" || user.role === "dm") {
                        try {
                            // Find the default campaign (owned by DM)
                            // We assume the DM email is configured or we look for the first campaign owned by a 'dm' role user
                            // For simplicity, let's look for a campaign owned by the specific DM email if known, or just the first active campaign

                            // Strategy: Find the first active campaign. In a single-DM system, this is likely the main campaign.
                            const campaign = await db.query.campaigns.findFirst({
                                where: (campaigns, { eq }) => eq(campaigns.isActive, true)
                            });

                            if (campaign) {
                                await db.insert(schema.campaignMembers).values({
                                    campaignId: campaign.id,
                                    userId: user.id,
                                    role: user.role === "dm" ? "dm" : "player"
                                });
                                console.log(`[Auth Hook] Auto-joined user ${user.email} to campaign ${campaign.title} as ${user.role}`);
                            } else {
                                console.warn("[Auth Hook] No active campaign found to auto-join.");
                            }
                        } catch (err) {
                            console.error("[Auth Hook] Failed to auto-join campaign:", err);
                        }
                    }
                }
            }
        }
    },

    // Email/password authentication
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
    },

    // Social providers
    socialProviders: {
        discord: {
            clientId: process.env.DISCORD_CLIENT_ID || "",
            clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
            mapProfileToUser: (profile: any) => ({
                id: profile.id,
                name: profile.username,
                email: profile.email,
                image: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
            })
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            mapProfileToUser: (profile: any) => ({
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
            })
        },
    },

    // Session configuration
    session: {
        expiresIn: 60 * 60 * 24 * 7,      // 7 days
        updateAge: 60 * 60 * 24,           // 1 day
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5,                // 5 minutes
        },
    },

    // CRITICAL: baseURL must NOT include path - basePath handles route prefix
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",

    // Explicitly set basePath (matches Hono route mounting at /api/auth/*)
    basePath: "/api/auth",

    // CORS trusted origins
    trustedOrigins: trustedOrigins,

    // Advanced settings for production HTTPS
    advanced: {
        // Cookie configuration for cross-origin requests
        cookiePrefix: "campaign-oracle",
        useSecureCookies: process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
        defaultCookieAttributes: {
            sameSite: "lax",
            httpOnly: true,
            secure: process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
            path: "/",
        },
    },
});

// Type export for client-side type inference
export type Auth = typeof auth;
