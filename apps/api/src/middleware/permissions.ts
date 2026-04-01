/**
 * Permissions Middleware
 * 
 * Role-based access control for Campaign Oracle API.
 * Checks user roles and campaign membership for authorization.
 */

import { Context, Next } from "hono";
import { db } from "../db";
import { campaignMembers, campaigns } from "../db/schema";
import { eq, and } from "drizzle-orm";

// Role hierarchy: dm > player > spectator
const ROLE_HIERARCHY = {
    dm: 3,
    player: 2,
    spectator: 1,
} as const;

export type Role = keyof typeof ROLE_HIERARCHY;

/**
 * Permission definitions
 */
export const PERMISSIONS = {
    // Campaign management
    'campaigns:read': ['dm', 'player', 'spectator'],
    'campaigns:write': ['dm'],
    'campaigns:delete': ['dm'],
    'campaigns:manage-members': ['dm'],
    
    // Character management
    'characters:read': ['dm', 'player', 'spectator'],
    'characters:write': ['dm', 'player'], // Players can edit their own
    'characters:delete': ['dm'],
    
    // Quest management
    'quests:read': ['dm', 'player', 'spectator'],
    'quests:write': ['dm'],
    'quests:delete': ['dm'],
    
    // NPC management
    'npcs:read': ['dm', 'player', 'spectator'],
    'npcs:write': ['dm'],
    'npcs:delete': ['dm'],
    
    // Session management
    'sessions:read': ['dm', 'player', 'spectator'],
    'sessions:write': ['dm'],
    'sessions:delete': ['dm'],
    
    // Oracle/AI features
    'oracle:use': ['dm'], // Only DM can use Oracle by default
    'oracle:rag': ['dm'], // Vertex AI Search features
    
    // Search features
    'search:read': ['dm', 'player'],
    'search:index': ['dm'], // Only DM can trigger indexing
    
    // Admin features
    'admin:usage': ['dm'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
    const allowedRoles = PERMISSIONS[permission] as readonly Role[];
    return allowedRoles.includes(role);
}

/**
 * Get user's role in a campaign
 */
export async function getCampaignRole(userId: string, campaignId: string): Promise<Role | null> {
    // First check if user is the DM (campaign owner)
    const campaign = await db.select({ dmUserId: campaigns.dmUserId })
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);
    
    if (campaign[0]?.dmUserId === userId) {
        return 'dm';
    }
    
    // Then check campaign membership
    const membership = await db.select({ role: campaignMembers.role })
        .from(campaignMembers)
        .where(and(
            eq(campaignMembers.campaignId, campaignId),
            eq(campaignMembers.userId, userId)
        ))
        .limit(1);
    
    return (membership[0]?.role as Role) || null;
}

/**
 * Middleware factory for requiring a specific permission
 */
export function requirePermission(permission: Permission) {
    return async (c: Context, next: Next) => {
        const user = c.get("user");
        if (!user) {
            return c.json({ error: "Unauthorized" }, 401);
        }
        
        // Get campaign ID from various sources
        const campaignId = getCampaignIdFromRequest(c);
        
        if (!campaignId) {
            // For non-campaign-specific routes, use user's defaultRole
            const userRole = (user.defaultRole as Role) || 'player';
            if (!hasPermission(userRole, permission)) {
                return c.json({ 
                    error: "Forbidden",
                    message: `Permission '${permission}' required`,
                    requiredRoles: PERMISSIONS[permission],
                }, 403);
            }
            c.set("userRole", userRole);
            return next();
        }
        
        // Get user's role in the specific campaign
        const role = await getCampaignRole(user.id, campaignId);
        
        if (!role) {
            return c.json({ 
                error: "Forbidden",
                message: "Not a member of this campaign",
            }, 403);
        }
        
        if (!hasPermission(role, permission)) {
            return c.json({ 
                error: "Forbidden",
                message: `Permission '${permission}' required`,
                requiredRoles: PERMISSIONS[permission],
                yourRole: role,
            }, 403);
        }
        
        c.set("userRole", role);
        c.set("campaignId", campaignId);
        return next();
    };
}

/**
 * Middleware to require DM role
 */
export const requireDM = requirePermission('campaigns:write');

/**
 * Middleware to require Oracle access
 */
export const requireOracleAccess = requirePermission('oracle:use');

/**
 * Extract campaign ID from request (body, params, or query)
 */
function getCampaignIdFromRequest(c: Context): string | null {
    // Try URL params first
    const paramId = c.req.param('campaignId') || c.req.param('id');
    if (paramId && isValidUUID(paramId)) return paramId;
    
    // Try query params
    const queryId = c.req.query('campaignId');
    if (queryId && isValidUUID(queryId)) return queryId;
    
    // Note: Don't parse body here as it may interfere with route handlers
    return null;
}

/**
 * Validate UUID format
 */
function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Declare Hono context variables
 */
declare module "hono" {
    interface ContextVariableMap {
        userRole: Role;
        campaignId: string;
    }
}
