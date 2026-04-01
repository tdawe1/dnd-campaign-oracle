
// Ability Scores
export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

// Skill with proficiency info
export interface CharacterSkill {
  name: string;
  ability: keyof AbilityScores;
  proficient: boolean;
  expertise: boolean;
  bonus: number;
}

// Class/Racial features
export interface CharacterTrait {
  name: string;
  source: string; // e.g., "Class", "Racial", "Background"
  sourceType: string; // e.g., "Rogue", "Half-Elf"
  description: string;
}

// Spells
export interface CharacterSpell {
  name: string;
  level: number; // 0 = cantrip
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  description: string;
  damage?: string;
  damageType?: string;
}

// Inventory items
export interface CharacterInventoryItem {
  name: string;
  quantity: number;
  weight: number;
  properties?: string;
  equipped?: boolean;
  description?: string;
}

// Attack/Weapon
export interface CharacterAttack {
  name: string;
  attackBonus: number;
  damage: string;
  damageType: string;
  range?: string;
}

// Extended data stored in JSONB
export interface CharacterExtendedData {
  // Physical description
  age?: string;
  height?: string;
  weight?: string;
  eyes?: string;
  skin?: string;
  hair?: string;
  // Background details
  personalityTraits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
  backstory?: string;
  // Mechanics
  skills?: CharacterSkill[];
  savingThrows?: { [ability: string]: { proficient: boolean; bonus: number } };
  traits?: CharacterTrait[];
  spells?: CharacterSpell[];
  inventory?: CharacterInventoryItem[];
  attacks?: CharacterAttack[];
  proficiencies?: { type: string; name: string }[];
  languages?: string[];
  // Spell slots
  spellSlots?: { level: number; total: number; used: number }[];
}

// Main Character interface
export interface Character {
  id: string;
  userId?: string;
  // Core identity
  name: string;
  player: string;
  class: string;
  subclass?: string;
  level: number;
  race?: string;
  subrace?: string;
  background?: string;
  alignment?: string;
  // Combat stats
  hp: number;
  maxHp: number;
  tempHp?: number;
  ac: number;
  initiative?: number;
  speed?: number;
  proficiencyBonus?: number;
  hitDice?: string;
  // Ability scores
  abilities?: AbilityScores;
  // Status
  status: string;
  notes: string;
  avatarUrl?: string;
  // Extended data
  extended?: CharacterExtendedData;
}


export interface Quest {
  id: string;
  type: 'Main' | 'Side' | 'Character' | 'Rumor';
  title: string;
  source: string;
  desc: string;
  status: 'active' | 'completed' | 'failed';
  location?: string;
  notes?: string;
  outcome?: string;
}

export interface NPC {
  id: string;
  name: string;
  location: string;
  notes: string;
  imageUrl?: string;
}

export interface SessionLog {
  id: string;
  title: string;
  date: string;
  tldr?: string; // Auto-generated 2-4 sentence summary
  summary: {
    combat: Array<{ name: string; result: string }>;
    location: string;
    loot: Array<{ name: string; effect: string }>;
    actionItems?: string[];
    keyMoments?: string[];
    questUpdates?: string[];
  };
  journalEntry: string;
  keyInteractions?: Array<{ npc: string; description: string }>;
  decisions?: Array<{ description: string; resolved: boolean }>;
  plans?: Array<{ description: string; completed: boolean }>;
  transcript?: string;
  audioUrl?: string;
  isPublic?: boolean; // Whether session is visible in public chronicle
}

export interface SessionAnalysisResult {
  title: string;
  location: string;
  journalEntry: string;
  combat: Array<{ name: string; result: string }>;
  loot: Array<{ name: string; effect: string }>;
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
export type ItemCategory = 'weapon' | 'armor' | 'consumable' | 'wondrous' | 'treasure' | 'misc';

export interface Item {
  id: string;
  name: string;
  description?: string;
  category: ItemCategory;
  rarity: ItemRarity;
  quantity: number;
  characterId?: string | null;
  characterName?: string;
  isEquipped: boolean;
  notes?: string;
  imageUrl?: string;
}

export interface CampaignData {
  campaignId?: string;
  title: string;
  dmUserId: string;
  party: Character[];
  quests: Quest[];
  npcs: NPC[];
  sessions: SessionLog[];
  items: Item[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  role?: 'dm' | 'player' | 'spectator';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'ai';
}

export type ViewState = 'dashboard' | 'party' | 'quests' | 'sessions' | 'settings' | 'oracle' | 'account';
