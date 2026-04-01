import { useQuery } from '@tanstack/react-query'
import { client } from '../lib/client'
import { campaignKeys } from '../utils/queryKeys'
import { CampaignData, Character, Quest, NPC, SessionLog, Item } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { NOVEMBER_SESSIONS } from './demoSessions'

// Types for API response entities (from Drizzle schema)
interface ApiCharacter {
    id: string;
    ownerId: string;
    name: string;
    playerName: string | null;
    characterClass: string | null;
    subclass: string | null;
    level: number;
    race: string | null;
    subrace: string | null;
    background: string | null;
    alignment: string | null;
    hp: number;
    maxHp: number;
    tempHp: number | null;
    ac: number;
    initiative: number | null;
    speed: number | null;
    proficiencyBonus: number | null;
    hitDice: string | null;
    strength: number | null;
    dexterity: number | null;
    constitution: number | null;
    intelligence: number | null;
    wisdom: number | null;
    charisma: number | null;
    status: string | null;
    notes: string | null;
    avatarUrl: string | null;
    extendedData: any | null;
}

interface ApiQuest {
    id: string;
    questType: string;
    title: string;
    source: string | null;
    description: string | null;
    outcome: string | null;
    status: string;
}

interface ApiNpc {
    id: string;
    name: string;
    location: string | null;
    notes: string | null;
    imageUrl: string | null;
}

interface ApiSessionLog {
    id: string;
    title: string;
    sessionDate: string;
    location: string | null;
    tldr: string | null;
    journalEntry: string | null;
    keyInteractions?: { npc: string; description: string }[] | null;
    decisions?: { description: string; resolved: boolean }[] | null;
    plans?: { description: string; completed: boolean }[] | null;
    transcript: string | null;
    audioUrl: string | null;
    combat?: { id: string; enemyName: string; result: string | null }[];
    loot?: { id: string; itemName: string; effect: string | null }[];
}

interface ApiItem {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    rarity: string | null;
    quantity: number;
    characterId: string | null;
    isEquipped: boolean | null;
    notes: string | null;
    imageUrl: string | null;
    character?: { name: string } | null;
}

// Demo data for unauthenticated users
const DEMO_CAMPAIGN_DATA: CampaignData = {
    campaignId: 'demo',
    title: 'The Lost Mine of Phandelver',
    dmUserId: 'demo-dm',
    party: [
        {
            id: 'demo-char-1',
            userId: 'demo-user-1',
            name: 'Thorin Ironforge',
            player: 'Demo Player 1',
            class: 'Fighter',
            subclass: 'Champion',
            level: 5,
            race: 'Dwarf',
            subrace: 'Mountain Dwarf',
            background: 'Soldier',
            alignment: 'Lawful Good',
            hp: 42,
            maxHp: 52,
            ac: 18,
            initiative: 1,
            speed: 25,
            proficiencyBonus: 3,
            hitDice: '5d10',
            abilities: { strength: 18, dexterity: 12, constitution: 16, intelligence: 10, wisdom: 12, charisma: 8 },
            status: 'active',
            notes: 'Champion of the dwarven hold. Wields a legendary battleaxe.',
            extended: {
                age: '85',
                height: "4'4\"",
                weight: '160 lb',
                eyes: 'Brown',
                skin: 'Tan',
                hair: 'Black (braided beard)',
                personalityTraits: 'I can stare down a hell hound without flinching.\nI enjoy being strong and like breaking things.',
                ideals: 'Greater Good. Our lot is to lay down our lives in defense of others. (Good)',
                bonds: 'I would still lay down my life for the people I served with.',
                flaws: 'The monstrous enemy that nearly destroyed my clan still haunts me.',
                backstory: 'Thorin served as a guard in the mountain halls of his clan for decades before a dragon attack forced him to become an adventurer.',
                skills: [
                    { name: 'Athletics', ability: 'strength', proficient: true, expertise: false, bonus: 7 },
                    { name: 'Intimidation', ability: 'charisma', proficient: true, expertise: false, bonus: 2 },
                    { name: 'Perception', ability: 'wisdom', proficient: true, expertise: false, bonus: 4 },
                    { name: 'Survival', ability: 'wisdom', proficient: true, expertise: false, bonus: 4 },
                ],
                savingThrows: {
                    strength: { proficient: true, bonus: 7 },
                    constitution: { proficient: true, bonus: 6 },
                },
                traits: [
                    { name: 'Second Wind', source: 'Class', sourceType: 'Fighter', description: 'You can use a bonus action to regain 1d10 + 5 hit points once per short rest.' },
                    { name: 'Action Surge', source: 'Class', sourceType: 'Fighter', description: 'You can take one additional action on your turn. Once per short rest.' },
                    { name: 'Improved Critical', source: 'Class', sourceType: 'Champion', description: 'Your weapon attacks score a critical hit on a roll of 19 or 20.' },
                    { name: 'Darkvision', source: 'Racial', sourceType: 'Dwarf', description: 'You can see in dim light within 60 feet as if bright light.' },
                    { name: 'Dwarven Resilience', source: 'Racial', sourceType: 'Dwarf', description: 'Advantage on saving throws against poison, resistance to poison damage.' },
                ],
                attacks: [
                    { name: 'Battleaxe', attackBonus: 7, damage: '1d10+4', damageType: 'Slashing' },
                    { name: 'Handaxe', attackBonus: 7, damage: '1d6+4', damageType: 'Slashing', range: '20/60' },
                ],
                inventory: [
                    { name: 'Battleaxe', quantity: 1, weight: 4, properties: 'Versatile (1d10)' },
                    { name: 'Chain Mail', quantity: 1, weight: 55, equipped: true },
                    { name: 'Shield', quantity: 1, weight: 6, equipped: true },
                    { name: 'Handaxe', quantity: 2, weight: 2 },
                ],
                proficiencies: [
                    { type: 'ARMOR', name: 'All armor' },
                    { type: 'WEAPON', name: 'All weapons' },
                    { type: 'TOOL', name: "Smith's Tools" },
                ],
                languages: ['Common', 'Dwarvish'],
            },
        },
        {
            id: 'demo-char-2',
            userId: 'demo-user-2',
            name: 'Elara Moonwhisper',
            player: 'Demo Player 2',
            class: 'Cleric',
            subclass: 'Light Domain',
            level: 5,
            race: 'Elf',
            subrace: 'High Elf',
            background: 'Acolyte',
            alignment: 'Neutral Good',
            hp: 38,
            maxHp: 38,
            ac: 16,
            initiative: 2,
            speed: 30,
            proficiencyBonus: 3,
            hitDice: '5d8',
            abilities: { strength: 10, dexterity: 14, constitution: 14, intelligence: 12, wisdom: 18, charisma: 10 },
            status: 'active',
            notes: 'Devoted to Selûne. Party healer with surprising combat prowess.',
            extended: {
                personalityTraits: 'I see omens in every event and action. The gods try to speak to us, we just need to listen.',
                ideals: 'Charity. I always try to help those in need, no matter the personal cost. (Good)',
                bonds: 'I will do anything to protect the temple where I served.',
                flaws: 'I put too much trust in those who wield power within my temple\'s hierarchy.',
                spells: [
                    { name: 'Sacred Flame', level: 0, school: 'evocation', castingTime: '1 action', range: '60 feet', duration: 'Instantaneous', description: 'Flame-like radiance descends on a creature. DEX save or 2d8 radiant damage.', damage: '2d8', damageType: 'Radiant' },
                    { name: 'Light', level: 0, school: 'evocation', castingTime: '1 action', range: 'Touch', duration: '1 hour', description: 'Object touched sheds bright light in 20-foot radius.' },
                    { name: 'Cure Wounds', level: 1, school: 'evocation', castingTime: '1 action', range: 'Touch', duration: 'Instantaneous', description: 'Creature regains 1d8 + 4 hit points.' },
                    { name: 'Guiding Bolt', level: 1, school: 'evocation', castingTime: '1 action', range: '120 feet', duration: '1 round', description: 'Ranged spell attack for 4d6 radiant damage, next attack has advantage.', damage: '4d6', damageType: 'Radiant' },
                    { name: 'Spirit Guardians', level: 3, school: 'conjuration', castingTime: '1 action', range: 'Self (15-foot radius)', duration: 'Concentration, up to 10 minutes', description: 'Spirits fly around you. Enemies take 3d8 radiant damage on failed WIS save.', damage: '3d8', damageType: 'Radiant' },
                ],
                spellSlots: [
                    { level: 1, total: 4, used: 1 },
                    { level: 2, total: 3, used: 0 },
                    { level: 3, total: 2, used: 0 },
                ],
                traits: [
                    { name: 'Channel Divinity: Radiance of the Dawn', source: 'Class', sourceType: 'Light Domain', description: 'Dispels magical darkness and deals 2d10 + 5 radiant damage to hostile creatures within 30 feet.' },
                    { name: 'Fey Ancestry', source: 'Racial', sourceType: 'Elf', description: 'Advantage on saving throws against being charmed, magic can\'t put you to sleep.' },
                    { name: 'Trance', source: 'Racial', sourceType: 'Elf', description: 'Elves don\'t need to sleep. Instead, they meditate for 4 hours a day.' },
                ],
            },
        },
        {
            id: 'demo-char-3',
            userId: 'demo-user-3',
            name: 'Arfine',
            player: 'Demo Player 3',
            class: 'Rogue',
            subclass: 'Arcane Trickster',
            level: 7,
            race: 'Half-Elf',
            background: 'Criminal (Pickpocket)',
            alignment: 'Chaotic Good',
            hp: 36,
            maxHp: 50,
            ac: 15,
            initiative: 4,
            speed: 30,
            proficiencyBonus: 3,
            hitDice: '7d8',
            abilities: { strength: 9, dexterity: 18, constitution: 12, intelligence: 13, wisdom: 10, charisma: 16 },
            status: 'active',
            notes: 'Mysterious past. Expert at finding traps and picking locks.',
            avatarUrl: 'https://s3.amazonaws.com/files.d20.io/images/435600160/AwfIX2KzMxOANugPwk1E5Q/med.png',
            extended: {
                age: '25',
                height: "5'4\"",
                weight: '120 lb',
                eyes: 'Green',
                skin: 'Grey',
                hair: 'Silver',
                personalityTraits: "I don't pay attention to the risks in a situation. Never tell me the odds.\nThe best way to get me to do something is to tell me I can't do it.",
                ideals: "Redemption. There's a spark of good in everyone. (Good)",
                bonds: 'Someone I loved died because of a mistake I made. That will never happen again.',
                flaws: 'I have a "tell" that reveals when I\'m lying.',
                backstory: 'I fell in with a thieves\' guild at an early age. After losing my one true love due to my inability to control my tell, I fled to Neverwinter seeking fortune. The Redbrands nearly killed me, and I vow revenge on Glasstaff.',
                skills: [
                    { name: 'Acrobatics', ability: 'dexterity', proficient: true, expertise: true, bonus: 10 },
                    { name: 'Deception', ability: 'charisma', proficient: true, expertise: true, bonus: 9 },
                    { name: 'Investigation', ability: 'intelligence', proficient: true, expertise: false, bonus: 4 },
                    { name: 'Intimidation', ability: 'charisma', proficient: true, expertise: false, bonus: 6 },
                    { name: 'Perception', ability: 'wisdom', proficient: true, expertise: true, bonus: 6 },
                    { name: 'Persuasion', ability: 'charisma', proficient: true, expertise: false, bonus: 6 },
                    { name: 'Sleight of Hand', ability: 'dexterity', proficient: true, expertise: false, bonus: 7 },
                    { name: 'Stealth', ability: 'dexterity', proficient: true, expertise: true, bonus: 10 },
                ],
                savingThrows: {
                    dexterity: { proficient: true, bonus: 7 },
                    intelligence: { proficient: true, bonus: 4 },
                },
                traits: [
                    { name: 'Sneak Attack', source: 'Class', sourceType: 'Rogue', description: 'Once per turn, deal an extra 4d6 damage to one creature you hit with an attack if you have advantage or an ally is within 5 feet.' },
                    { name: 'Cunning Action', source: 'Class', sourceType: 'Rogue', description: 'Bonus action to Dash, Disengage, or Hide.' },
                    { name: 'Mage Hand Legerdemain', source: 'Class', sourceType: 'Arcane Trickster', description: 'Can make mage hand invisible, use it to pick locks, disarm traps, and plant/retrieve objects from creatures.' },
                    { name: 'Darkvision', source: 'Racial', sourceType: 'Half-Elf', description: 'You can see in dim light within 60 feet as if it were bright light.' },
                    { name: 'Fey Ancestry', source: 'Racial', sourceType: 'Half-Elf', description: 'Advantage on saves against being charmed, magic can\'t put you to sleep.' },
                    { name: 'Criminal Contact', source: 'Background', sourceType: 'Criminal', description: 'You have a reliable contact who acts as a liaison to a network of criminals.' },
                ],
                spells: [
                    { name: 'Mage Hand', level: 0, school: 'conjuration', castingTime: '1 action', range: '30 feet', duration: '1 minute', description: 'A spectral hand appears to manipulate objects up to 10 pounds.' },
                    { name: 'Shocking Grasp', level: 0, school: 'evocation', castingTime: '1 action', range: 'Touch', duration: 'Instantaneous', description: 'Melee spell attack. 2d8 lightning damage, target can\'t take reactions.', damage: '2d8', damageType: 'Lightning' },
                    { name: 'Chill Touch', level: 0, school: 'necromancy', castingTime: '1 action', range: '120 feet', duration: '1 round', description: 'Ranged spell attack. 2d8 necrotic damage, target can\'t regain HP.', damage: '2d8', damageType: 'Necrotic' },
                    { name: 'Color Spray', level: 1, school: 'illusion', castingTime: '1 action', range: 'Self (15-foot cone)', duration: '1 round', description: 'Roll 6d10; blind creatures with HP totaling that amount or less.' },
                    { name: 'Witch Bolt', level: 1, school: 'evocation', castingTime: '1 action', range: '30 feet', duration: 'Concentration, up to 1 minute', description: 'Ranged spell attack. 1d12 lightning damage, use action on subsequent turns to deal 1d12 automatically.', damage: '1d12', damageType: 'Lightning' },
                ],
                spellSlots: [
                    { level: 1, total: 4, used: 0 },
                    { level: 2, total: 2, used: 0 },
                ],
                attacks: [
                    { name: 'Blade of Correction', attackBonus: 8, damage: '1d8+5', damageType: 'Piercing' },
                    { name: 'Shortbow', attackBonus: 7, damage: '1d6+6', damageType: 'Piercing', range: '80/320' },
                    { name: 'Dagger', attackBonus: 7, damage: '1d4+4', damageType: 'Piercing', range: '20/60' },
                ],
                inventory: [
                    { name: 'Blade of Correction', quantity: 1, weight: 2, properties: 'Finesse, reroll 1s on damage' },
                    { name: 'Shortbow', quantity: 1, weight: 2, properties: 'Ammunition, Range 80/320' },
                    { name: 'Leather Armor', quantity: 1, weight: 10, equipped: true },
                    { name: 'Thieves\' Tools', quantity: 1, weight: 1 },
                    { name: 'Arrows', quantity: 20, weight: 1 },
                    { name: 'Dagger', quantity: 2, weight: 1 },
                ],
                proficiencies: [
                    { type: 'ARMOR', name: 'Light Armor' },
                    { type: 'WEAPON', name: 'Simple weapons' },
                    { type: 'WEAPON', name: 'Hand Crossbow, Longsword, Rapier, Shortsword' },
                    { type: 'TOOL', name: "Thieves' Tools" },
                    { type: 'TOOL', name: 'Playing Card Set' },
                ],
                languages: ['Common', 'Elvish', 'Goblin', "Thieves' Cant"],
            },
        },
        {
            id: 'demo-char-4',
            userId: 'demo-user-4',
            name: 'Zara the Wise',
            player: 'Demo Player 4',
            class: 'Wizard',
            subclass: 'School of Evocation',
            level: 5,
            race: 'Human',
            background: 'Sage',
            alignment: 'Neutral',
            hp: 22,
            maxHp: 26,
            ac: 12,
            initiative: 2,
            speed: 30,
            proficiencyBonus: 3,
            hitDice: '5d6',
            abilities: { strength: 8, dexterity: 14, constitution: 12, intelligence: 18, wisdom: 13, charisma: 10 },
            status: 'active',
            notes: 'Specializes in evocation magic. Carries a spellbook from an ancient order.',
            extended: {
                personalityTraits: "I use polysyllabic words that convey the impression of great erudition.\nThere's nothing I like more than a good mystery.",
                ideals: 'Knowledge. The path to power and self-improvement is through knowledge. (Neutral)',
                bonds: 'I have an ancient text that holds terrible secrets that must not fall into the wrong hands.',
                flaws: "Unlocking an ancient mystery is worth the price of a civilization.",
                spells: [
                    { name: 'Fire Bolt', level: 0, school: 'evocation', castingTime: '1 action', range: '120 feet', duration: 'Instantaneous', description: 'Ranged spell attack for 2d10 fire damage.', damage: '2d10', damageType: 'Fire' },
                    { name: 'Prestidigitation', level: 0, school: 'transmutation', castingTime: '1 action', range: '10 feet', duration: 'Up to 1 hour', description: 'Minor magical tricks.' },
                    { name: 'Magic Missile', level: 1, school: 'evocation', castingTime: '1 action', range: '120 feet', duration: 'Instantaneous', description: 'Three darts hit targets for 1d4+1 force damage each.', damage: '3d4+3', damageType: 'Force' },
                    { name: 'Shield', level: 1, school: 'abjuration', castingTime: '1 reaction', range: 'Self', duration: '1 round', description: '+5 AC until the start of your next turn, including against triggering attack.' },
                    { name: 'Fireball', level: 3, school: 'evocation', castingTime: '1 action', range: '150 feet', duration: 'Instantaneous', description: '20-foot radius sphere explodes for 8d6 fire damage. DEX save for half.', damage: '8d6', damageType: 'Fire' },
                    { name: 'Counterspell', level: 3, school: 'abjuration', castingTime: '1 reaction', range: '60 feet', duration: 'Instantaneous', description: 'Interrupt a creature casting a spell of 3rd level or lower.' },
                ],
                spellSlots: [
                    { level: 1, total: 4, used: 2 },
                    { level: 2, total: 3, used: 1 },
                    { level: 3, total: 2, used: 0 },
                ],
                traits: [
                    { name: 'Sculpt Spells', source: 'Class', sourceType: 'School of Evocation', description: 'When you cast an evocation spell, you can protect allies from its effects. Choose a number of creatures equal to 1 + spell level.' },
                    { name: 'Potent Cantrip', source: 'Class', sourceType: 'School of Evocation', description: 'When a creature succeeds on a saving throw against your cantrip, it still takes half damage.' },
                    { name: 'Arcane Recovery', source: 'Class', sourceType: 'Wizard', description: 'Once per day during a short rest, recover spell slots totaling up to half your wizard level.' },
                ],
            },
        },
    ],
    quests: [
        {
            id: 'quest-m4',
            type: 'Main',
            title: 'Kill the Redbrand Leader, Glasstaff',
            source: 'Halia Thornton, Phandalin Miners\' Exchange',
            desc: 'Glasstaff has fled the Redbrand base in Phandalin. We believe he may be headed for Cragmaw Castle. Deliver any documents or correspondence found.',
            status: 'completed',
            outcome: 'Glasstaff destroyed. Reward 100gp.',
            location: 'Cragmaw Castle',
        },
        {
            id: 'quest-m5',
            type: 'Character',
            title: 'Revenge on Glasstaff',
            source: 'Arfine',
            desc: 'Get revenge on Glasstaff for trying to have me killed.',
            status: 'completed',
            outcome: 'Glasstaff destroyed.',
        },
        {
            id: 'quest-m6',
            type: 'Main',
            title: 'Wave Echo Cave',
            source: 'Gundren Rockseeker',
            desc: 'Travel to the long-lost Wave Echo Cave, site of the mines of the Phandelver\'s Pact and the legendary Forge of Spells. Find out what has happened to Gundren\'s brothers.',
            status: 'completed',
            outcome: 'Saved Gundren\'s brother, Nundro. Returned Tharden\'s body. Received 10% share in the mine.',
            location: 'Wave Echo Cave',
        },
        {
            id: 'quest-s1',
            type: 'Side',
            title: 'Find Talgen\'s Siblings',
            source: 'Shava',
            desc: 'Find the missing siblings. They may have been taken by the vampire tree.',
            status: 'completed',
            outcome: 'They were found but harmed by the vampire tree. Bought horses for Talgen to take them to Neverwinter for a cure.',
        },
        {
            id: 'quest-s6',
            type: 'Side',
            title: 'Wyvern Tor Orcs',
            source: 'Harbin, Phandalin Town Master',
            desc: 'Investigate rumours of a band of orcs camped out near Wyvern Tor. Harbin offered 100gp reward.',
            status: 'completed',
            outcome: 'Dealt with orcs and an ogre. Received 150gp.',
            location: 'Wyvern Tor',
        },
        {
            id: 'quest-s12',
            type: 'Side',
            title: 'Margaster Family Stash',
            source: 'Othovir, Harness Maker',
            desc: 'Find the stash of magic items hidden in the Margaster carriage house in Silverymoon.',
            status: 'completed',
            outcome: 'Found carriage house, defeated enemies, retrieved loot. Escaped pursuit from Margaster mage.',
            location: 'Silverymoon',
        },
        {
            id: 'quest-s13',
            type: 'Side',
            title: 'Deliver Horse Harnesses',
            source: 'Narth Tezrin, Lionshield Coster',
            desc: 'Deliver horse harnesses to Noannar\'s Hold. Receive 100gp and keep the cart and horse.',
            status: 'completed',
            outcome: 'Delivered harnesses. Explored the hold and killed the hunt lords.',
            location: 'Noannar\'s Hold',
        },
        {
            id: 'quest-s14',
            type: 'Side',
            title: 'Mysterious Mansion',
            source: 'Found during travel',
            desc: 'Entered a mysterious mansion through a magic door at the end of a cave.',
            status: 'completed',
            outcome: 'Received "Deed to the Manor" which entitles bearer to one Extra Dimensional Manor.',
        },
        {
            id: 'quest-s16',
            type: 'Side',
            title: 'Bury the Elf Woman',
            source: 'Ghost of Elf Woman',
            desc: 'Bury her remains at the foot of a tree to free her from anguish.',
            status: 'completed',
            outcome: 'Buried her remains beneath a tree near our manor house.',
        },
    ],
    npcs: [
        {
            id: 'demo-npc-1',
            name: 'Gundren Rockseeker',
            location: 'Unknown (Kidnapped)',
            notes: 'Dwarf entrepreneur who hired the party. Discovered the entrance to Wave Echo Cave with his brothers.',
        },
        {
            id: 'demo-npc-2',
            name: 'Sildar Hallwinter',
            location: 'Phandalin',
            notes: "Human warrior and agent of the Lords' Alliance. Rescued from Cragmaw Hideout. Now organizing defenses in Phandalin.",
        },
        {
            id: 'demo-npc-3',
            name: 'Sister Garaele',
            location: 'Shrine of Luck, Phandalin',
            notes: 'Elven cleric of Tymora. Asked the party to negotiate with the banshee Agatha.',
        },
        {
            id: 'demo-npc-4',
            name: 'Glasstaff (Iarno Albrek)',
            location: 'Defeated',
            notes: 'Former wizard who led the Redbrands. Actually a traitor working for the Black Spider. Escaped during the raid on the hideout.',
        },
    ],
    sessions: [
        ...NOVEMBER_SESSIONS,
        {
            id: 'demo-session-1',
            title: 'Session 5: The Redbrand Takedown',
            date: '2024-11-30',
            summary: {
                combat: [
                    { name: 'Redbrand Ruffians x4', result: 'Victory' },
                    { name: 'Nothic', result: 'Negotiated passage' },
                    { name: 'Glasstaff', result: 'Escaped' },
                ],
                location: 'Tresendar Manor Cellars',
                loot: [
                    { name: 'Staff of Defense', effect: '+1 AC, can cast Shield and Mage Armor' },
                    { name: 'Gold (180gp)', effect: 'Party funds' },
                ],
                keyMoments: [
                    "Discovered the secret door leading to Glasstaff's quarters",
                    "Negotiated with the Nothic instead of fighting",
                    "Found the note from the Black Spider"
                ],
                actionItems: [
                    "Identify the potion found in the lab",
                    "Head to Cragmaw Castle to rescue Gundren",
                    "Return the Lionshield Coster goods"
                ],
                questUpdates: [
                    "Completed: Kill the Redbrand Leader (Glasstaff escaped but threat neutralized)",
                    "New Clue: The Black Spider is seeking the Forge of Spells"
                ]
            },
            decisions: [
                { description: "Spared the goblin Droop and let him tag along", resolved: true },
                { description: "Decided to rest in the manor before heading to Cragmaw Castle", resolved: true }
            ],
            journalEntry: 'We descended into the cellars beneath Tresendar Manor, fighting through Redbrand thugs. The underground complex held dark secrets — including a one-eyed creature called a nothic that we managed to parley with. It revealed that Glasstaff was actually Iarno Albrek, a missing Lords Alliance agent turned traitor. We stormed his quarters but he escaped through a secret passage. We freed prisoners and recovered his magical staff.',
        },
        {
            id: 'demo-session-2',
            title: 'Session 4: Journey to Phandalin',
            date: '2024-11-16',
            summary: {
                combat: [
                    { name: 'Goblin Ambush x6', result: 'Victory' },
                    { name: 'Bugbear (Klarg)', result: 'Victory' },
                ],
                location: 'Triboar Trail & Cragmaw Hideout',
                loot: [
                    { name: 'Lionshield Trading Goods', effect: 'Returned for 50gp reward' },
                ],
            },
            journalEntry: 'Our escort mission went sideways when we found our employers horses dead on the road. Following goblin tracks, we discovered Cragmaw Hideout and rescued Sildar Hallwinter. He told us Gundren was taken to "Cragmaw Castle" by order of someone called the Black Spider. We arrived in Phandalin to find the town oppressed by the Redbrand gang.',
        },
    ],
    items: [
        {
            id: 'demo-item-1',
            name: 'Staff of Defense',
            description: 'A slender, elegant staff topped with a silver crescent moon. Grants defensive magical abilities.',
            category: 'weapon',
            rarity: 'rare',
            quantity: 1,
            characterId: 'demo-char-4',
            characterName: 'Elara Moonshadow',
            isEquipped: true,
            notes: '+1 AC, can cast Shield (1 charge) and Mage Armor (1 charge)',
        },
        {
            id: 'demo-item-2',
            name: 'Potion of Healing',
            description: 'A red liquid that shimmers when agitated.',
            category: 'consumable',
            rarity: 'common',
            quantity: 4,
            characterId: null,
            isEquipped: false,
            notes: 'Heals 2d4+2 HP',
        },
        {
            id: 'demo-item-3',
            name: 'Gauntlets of Ogre Power',
            description: 'Heavy iron gauntlets inscribed with strength runes.',
            category: 'wondrous',
            rarity: 'uncommon',
            quantity: 1,
            characterId: 'demo-char-1',
            characterName: 'Thorin Ironforge',
            isEquipped: true,
            notes: 'Strength score becomes 19',
        },
        {
            id: 'demo-item-4',
            name: 'Diamond Necklace',
            description: 'An exquisite necklace with a large diamond pendant.',
            category: 'treasure',
            rarity: 'rare',
            quantity: 1,
            characterId: null,
            isEquipped: false,
            notes: 'Worth approximately 500gp. Found in the Redbrand hideout.',
        },
    ],
};

export function useCampaignData(campaignId: string = 'default') {
    const { isDemo } = useAuth();

    // When in demo mode, use placeholderData and disable API fetching entirely
    return useQuery({
        queryKey: isDemo ? ['demo-campaign'] : campaignKeys.detail(campaignId),
        queryFn: async (): Promise<CampaignData> => {
            // This should never be called in demo mode due to enabled: !isDemo
            let targetId = campaignId;

            if (campaignId === 'default') {
                const res = await client.api.campaigns.$get();
                if (!res.ok) throw new Error("Failed to fetch campaigns");
                const campaigns = await res.json();

                if (campaigns.length > 0) {
                    targetId = campaigns[0].id;
                } else {
                    return {
                        title: 'New Campaign',
                        dmUserId: '',
                        party: [],
                        quests: [],
                        npcs: [],
                        sessions: [],
                        items: []
                    };
                }
            }

            const res = await client.api.campaigns[':id'].$get({ param: { id: targetId } });
            if (!res.ok) throw new Error("Campaign not found");

            // Hono RPC infers the type of 'campaign' from the backend handler's return value
            const campaign = await res.json();

            // Map Drizzle entities to App types
            // Drizzle query result includes relations defined in 'with' clause

            const party: Character[] = (campaign.characters as ApiCharacter[]).map((c: ApiCharacter) => {
                // Transform extendedData from DB format to frontend format
                const ext = c.extendedData || {};
                
                // Transform skills object { skill_name: { bonus, proficient } } to array
                const skillAbilityMap: Record<string, keyof import('../../types').AbilityScores> = {
                    acrobatics: 'dexterity', animal_handling: 'wisdom', arcana: 'intelligence',
                    athletics: 'strength', deception: 'charisma', history: 'intelligence',
                    insight: 'wisdom', intimidation: 'charisma', investigation: 'intelligence',
                    medicine: 'wisdom', nature: 'intelligence', perception: 'wisdom',
                    performance: 'charisma', persuasion: 'charisma', religion: 'intelligence',
                    sleight_of_hand: 'dexterity', stealth: 'dexterity', survival: 'wisdom',
                };
                
                const skills = ext.skills ? Object.entries(ext.skills).map(([name, data]: [string, any]) => ({
                    name: name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                    ability: skillAbilityMap[name] || 'constitution',
                    proficient: data?.proficient || false,
                    expertise: false,
                    bonus: data?.bonus || 0,
                })) : [];
                
                // Transform attacks array
                const attacks = (ext.attacks || []).map((a: any) => ({
                    name: a.name || 'Unknown',
                    attackBonus: parseInt(String(a.bonus || '0').replace('+', '')) || 0,
                    damage: a.damage || '1d4',
                    damageType: a.damageType || 'Bludgeoning',
                    range: a.range || undefined,
                }));
                
                // Transform traits array
                const traits = (ext.traits || []).map((t: any) => ({
                    name: t.name || 'Unknown',
                    source: t.sourceType || 'Class',
                    sourceType: t.source || 'Unknown',
                    description: t.description || '',
                }));
                
                // Transform inventory array
                const inventory = (ext.inventory || []).map((i: any) => ({
                    name: i.name || 'Unknown',
                    quantity: i.quantity || 1,
                    weight: i.weight || 0,
                    properties: i.description || undefined,
                    equipped: false,
                }));
                
                // Transform spells array
                const spells = (ext.spells || []).map((s: any) => ({
                    name: s.name || 'Unknown',
                    level: s.level ?? 0,
                    school: s.school || 'unknown',
                    castingTime: s.castingTime || '1 action',
                    range: s.range || 'Self',
                    duration: s.duration || 'Instantaneous',
                    description: s.description || '',
                    damage: s.damage || undefined,
                    damageType: s.damageType || undefined,
                }));
                
                return {
                    id: c.id,
                    userId: c.ownerId,
                    name: c.name,
                    player: c.playerName || '',
                    class: c.characterClass || '',
                    subclass: c.subclass || undefined,
                    level: c.level,
                    race: c.race || undefined,
                    subrace: c.subrace || undefined,
                    background: c.background || undefined,
                    alignment: c.alignment || undefined,
                    hp: c.hp,
                    maxHp: c.maxHp,
                    tempHp: c.tempHp || undefined,
                    ac: c.ac,
                    initiative: c.initiative || undefined,
                    speed: c.speed || undefined,
                    proficiencyBonus: c.proficiencyBonus || undefined,
                    hitDice: c.hitDice || undefined,
                    abilities: {
                        strength: c.strength || 10,
                        dexterity: c.dexterity || 10,
                        constitution: c.constitution || 10,
                        intelligence: c.intelligence || 10,
                        wisdom: c.wisdom || 10,
                        charisma: c.charisma || 10,
                    },
                    status: c.status || 'active',
                    notes: c.notes || '',
                    avatarUrl: c.avatarUrl || undefined,
                    extended: {
                        skills: skills.length > 0 ? skills : undefined,
                        attacks: attacks.length > 0 ? attacks : undefined,
                        traits: traits.length > 0 ? traits : undefined,
                        inventory: inventory.length > 0 ? inventory : undefined,
                        spells: spells.length > 0 ? spells : undefined,
                    },
                };
            });

            const quests: Quest[] = (campaign.quests as ApiQuest[]).map((q: ApiQuest) => ({
                id: q.id,
                type: q.questType as any, // TODO: sync QuestType enum in frontend types
                title: q.title,
                source: q.source || '',
                desc: q.description || '',
                outcome: q.outcome || undefined,
                status: q.status as any
            }));

            const npcs: NPC[] = (campaign.npcs as ApiNpc[]).map((n: ApiNpc) => ({
                id: n.id,
                name: n.name,
                location: n.location || '',
                notes: n.notes || '',
                imageUrl: n.imageUrl || undefined
            }));

            const sessions: SessionLog[] = (campaign.sessionLogs as ApiSessionLog[]).map((s: ApiSessionLog) => ({
                id: s.id,
                title: s.title,
                date: s.sessionDate,
                tldr: s.tldr || undefined,
                summary: {
                    combat: (s.combat || []).map(c => ({ name: c.enemyName, result: c.result || 'Unknown' })),
                    location: s.location || 'Unknown Location',
                    loot: (s.loot || []).map(l => ({ name: l.itemName, effect: l.effect || '' }))
                },
                journalEntry: s.journalEntry || '',
                keyInteractions: s.keyInteractions || undefined,
                decisions: s.decisions || undefined,
                plans: s.plans || undefined,
                transcript: s.transcript || undefined,
                audioUrl: s.audioUrl || undefined
            }));

            const items: Item[] = ((campaign as any).items as ApiItem[] || []).map((i: ApiItem) => ({
                id: i.id,
                name: i.name,
                description: i.description || undefined,
                category: (i.category || 'misc') as any,
                rarity: (i.rarity || 'common') as any,
                quantity: i.quantity,
                characterId: i.characterId,
                characterName: i.character?.name,
                isEquipped: i.isEquipped || false,
                notes: i.notes || undefined,
                imageUrl: i.imageUrl || undefined
            }));

            return {
                campaignId: targetId,
                title: campaign.title,
                dmUserId: campaign.dmUserId,
                party,
                quests,
                npcs,
                sessions,
                items
            };
        },
        // Disable API fetching in demo mode - use placeholderData instead
        enabled: !isDemo,
        // Provide demo data as placeholder when in demo mode
        placeholderData: isDemo ? DEMO_CAMPAIGN_DATA : undefined,
    })
}

