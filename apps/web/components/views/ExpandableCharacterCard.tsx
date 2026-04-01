import React, { useState } from 'react';
import { UserPlus, Plus, ChevronDown, ChevronUp, Sword, Shield, Heart, Zap, Sparkles, BookOpen, Backpack, User, Scroll, X } from 'lucide-react';
import { Character, AbilityScores } from '../../types';
import { Badge } from '../ui/Badge';

interface CharacterCardProps {
    character: Character;
    isDM?: boolean;
    onSave?: (characterId: string, data: any) => void;
}

// Helper to calculate ability modifier
const getModifier = (score: number) => Math.floor((score - 10) / 2);
const formatModifier = (mod: number) => mod >= 0 ? `+${mod}` : `${mod}`;

// Ability Score Box (view mode or edit mode)
const AbilityBox: React.FC<{ 
    name: string; 
    score: number; 
    short: string;
    isEditing?: boolean;
    onChangeScore?: (value: number) => void;
}> = ({ name, score, short, isEditing = false, onChangeScore }) => (
    <div className="flex flex-col items-center bg-neutral-950/50 rounded-lg p-3 border border-neutral-800/50">
        <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">{short}</span>
        <span className="text-2xl font-bold text-white">{formatModifier(getModifier(score))}</span>
        {isEditing && onChangeScore ? (
            <input
                type="number"
                value={score}
                onChange={(e) => onChangeScore(parseInt(e.target.value) || 10)}
                className="w-12 text-center text-sm text-neutral-300 bg-neutral-800 border border-neutral-600 rounded mt-1"
                min={1}
                max={30}
            />
        ) : (
            <span className="text-sm text-neutral-400">{score}</span>
        )}
    </div>
);

// Skill list item
const SkillItem: React.FC<{ name: string; bonus: number; proficient: boolean; expertise: boolean }> = ({ name, bonus, proficient, expertise }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-neutral-800/30 last:border-0">
        <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${expertise ? 'bg-amber-500' : proficient ? 'bg-indigo-500' : 'bg-neutral-700'}`} />
            <span className="text-sm text-neutral-300">{name}</span>
        </div>
        <span className="text-sm font-mono text-neutral-400">{formatModifier(bonus)}</span>
    </div>
);

// Trait card
const TraitCard: React.FC<{ name: string; source: string; sourceType: string; description: string }> = ({ name, source, sourceType, description }) => (
    <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30">
        <div className="flex items-center gap-2 mb-2">
            <span className="text-base font-semibold text-white">{name}</span>
            <Badge type={source === 'Class' ? 'neutral' : source === 'Racial' ? 'success' : 'main'}>
                {sourceType}
            </Badge>
        </div>
        <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
    </div>
);

// Spell card
const SpellCard: React.FC<{ name: string; level: number; school: string; damage?: string; damageType?: string; description: string }> = ({ name, level, school, damage, damageType, description }) => (
    <div className="bg-neutral-950/30 rounded-lg p-3 border border-neutral-800/30">
        <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-white">{name}</span>
            <span className="text-xs text-indigo-400 capitalize">{level === 0 ? 'Cantrip' : `Level ${level}`}</span>
        </div>
        <p className="text-xs text-neutral-500 capitalize mb-1">{school}</p>
        {damage && <p className="text-xs text-amber-400 mb-1">{damage} {damageType}</p>}
        <p className="text-xs text-neutral-400 line-clamp-2">{description}</p>
    </div>
);

// Attack row
const AttackRow: React.FC<{ name: string; attackBonus: number; damage: string; damageType: string; range?: string }> = ({ name, attackBonus, damage, damageType, range }) => (
    <div className="flex items-center justify-between py-2 border-b border-neutral-800/30 last:border-0">
        <span className="text-sm text-neutral-200 font-medium">{name}</span>
        <div className="flex items-center gap-4 text-sm">
            <span className="text-neutral-400 font-mono">{formatModifier(attackBonus)}</span>
            <span className="text-amber-400 font-medium">{damage}</span>
            <span className="text-neutral-500">{damageType}</span>
            {range && <span className="text-neutral-600">{range}</span>}
        </div>
    </div>
);

// Full Screen Modal with Edit Mode
const CharacterSheetModal: React.FC<{ 
    character: Character; 
    onClose: () => void;
    isDM?: boolean;
    onSave?: (characterId: string, data: any) => void;
}> = ({ character, onClose, isDM = false, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const extended = character.extended;
    
    const [editData, setEditData] = useState({
        name: character.name,
        characterClass: character.class,
        subclass: character.subclass || '',
        race: character.race || '',
        level: character.level,
        background: character.background || '',
        alignment: character.alignment || '',
        hp: character.hp,
        maxHp: character.maxHp,
        ac: character.ac,
        speed: character.speed || 30,
        strength: character.abilities?.strength || 10,
        dexterity: character.abilities?.dexterity || 10,
        constitution: character.abilities?.constitution || 10,
        intelligence: character.abilities?.intelligence || 10,
        wisdom: character.abilities?.wisdom || 10,
        charisma: character.abilities?.charisma || 10,
        // Extended data arrays (deep copy to avoid mutation)
        skills: extended?.skills ? [...extended.skills] : [],
        attacks: extended?.attacks ? [...extended.attacks.map(a => ({...a}))] : [],
        traits: extended?.traits ? [...extended.traits.map(t => ({...t}))] : [],
        inventory: extended?.inventory ? [...extended.inventory.map(i => ({...i}))] : [],
        spells: extended?.spells ? [...extended.spells.map(s => ({...s}))] : [],
    });
    const [isSaving, setIsSaving] = useState(false);

    const abilities = character.abilities || { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };

    const handleSave = async () => {
        if (!onSave) return;
        setIsSaving(true);
        try {
            // Build extendedData from edit state
            const extendedData = {
                skills: editData.skills.reduce((acc: any, s: any) => {
                    acc[s.name.toLowerCase().replace(/ /g, '_')] = { bonus: s.bonus, proficient: s.proficient };
                    return acc;
                }, {}),
                attacks: editData.attacks,
                traits: editData.traits,
                inventory: editData.inventory,
                spells: editData.spells,
            };
            
            const saveData = {
                name: editData.name,
                characterClass: editData.characterClass,
                subclass: editData.subclass,
                race: editData.race,
                level: editData.level,
                background: editData.background,
                alignment: editData.alignment,
                hp: editData.hp,
                maxHp: editData.maxHp,
                ac: editData.ac,
                speed: editData.speed,
                strength: editData.strength,
                dexterity: editData.dexterity,
                constitution: editData.constitution,
                intelligence: editData.intelligence,
                wisdom: editData.wisdom,
                charisma: editData.charisma,
                extendedData,
            };
            
            await onSave(character.id, saveData);
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to save:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (field: string, value: any) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    // Helper to update an item in an array field
    const updateArrayItem = (field: string, index: number, key: string, value: any) => {
        setEditData(prev => {
            const arr = [...(prev as any)[field]];
            arr[index] = { ...arr[index], [key]: value };
            return { ...prev, [field]: arr };
        });
    };

    // Helper to remove an item from an array field
    const removeArrayItem = (field: string, index: number) => {
        setEditData(prev => {
            const arr = [...(prev as any)[field]];
            arr.splice(index, 1);
            return { ...prev, [field]: arr };
        });
    };

    // Helper to add an item to an array field
    const addArrayItem = (field: string, newItem: any) => {
        setEditData(prev => {
            const arr = [...(prev as any)[field], newItem];
            return { ...prev, [field]: arr };
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-4xl max-h-[90vh] m-4 mt-8 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-neutral-900/95 backdrop-blur border-b border-neutral-800 px-6 py-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            {character.avatarUrl ? (
                                <img src={character.avatarUrl} alt={character.name} className="w-16 h-16 rounded-full object-cover border-2 border-neutral-700" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 font-bold text-2xl border-2 border-neutral-700">
                                    {character.name.charAt(0)}
                                </div>
                            )}
                            <div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editData.name}
                                        onChange={(e) => updateField('name', e.target.value)}
                                        className="text-xl font-bold text-white bg-neutral-800 border border-neutral-600 rounded px-2 py-1"
                                    />
                                ) : (
                                    <h2 className="text-xl font-bold text-white">{character.name}</h2>
                                )}
                                {isEditing ? (
                                    <div className="flex gap-2 mt-1">
                                        <input
                                            type="text"
                                            value={editData.race}
                                            onChange={(e) => updateField('race', e.target.value)}
                                            placeholder="Race"
                                            className="text-sm text-neutral-300 bg-neutral-800 border border-neutral-600 rounded px-2 py-0.5 w-24"
                                        />
                                        <input
                                            type="text"
                                            value={editData.characterClass}
                                            onChange={(e) => updateField('characterClass', e.target.value)}
                                            placeholder="Class"
                                            className="text-sm text-neutral-300 bg-neutral-800 border border-neutral-600 rounded px-2 py-0.5 w-24"
                                        />
                                        <input
                                            type="number"
                                            value={editData.level}
                                            onChange={(e) => updateField('level', parseInt(e.target.value) || 1)}
                                            className="text-sm text-neutral-300 bg-neutral-800 border border-neutral-600 rounded px-2 py-0.5 w-16"
                                        />
                                    </div>
                                ) : (
                                    <p className="text-sm text-neutral-400 mt-0.5">
                                        {character.race && `${character.race} `}{character.class}{character.subclass && ` (${character.subclass})`} • Level {character.level}
                                    </p>
                                )}
                                {!isEditing && character.background && (
                                    <p className="text-xs text-neutral-500 mt-1">{character.background}{character.alignment && ` • ${character.alignment}`}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Combat Stats */}
                            <div className="flex gap-2">
                                <div className="bg-red-950/50 border border-red-900/50 rounded-lg px-3 py-2 text-center">
                                    <div className="text-xs text-red-400 uppercase tracking-wider">HP</div>
                                    {isEditing ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                value={editData.hp}
                                                onChange={(e) => updateField('hp', parseInt(e.target.value) || 0)}
                                                className="w-12 text-center text-sm font-bold text-red-300 bg-transparent border border-red-800 rounded"
                                            />
                                            <span className="text-red-500">/</span>
                                            <input
                                                type="number"
                                                value={editData.maxHp}
                                                onChange={(e) => updateField('maxHp', parseInt(e.target.value) || 0)}
                                                className="w-12 text-center text-sm font-bold text-red-300 bg-transparent border border-red-800 rounded"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-lg font-bold text-red-300">{character.hp}/{character.maxHp}</div>
                                    )}
                                </div>
                                <div className="bg-blue-950/50 border border-blue-900/50 rounded-lg px-3 py-2 text-center">
                                    <div className="text-xs text-blue-400 uppercase tracking-wider">AC</div>
                                    {isEditing ? (
                                        <input
                                            type="number"
                                            value={editData.ac}
                                            onChange={(e) => updateField('ac', parseInt(e.target.value) || 10)}
                                            className="w-12 text-center text-lg font-bold text-blue-300 bg-transparent border border-blue-800 rounded"
                                        />
                                    ) : (
                                        <div className="text-lg font-bold text-blue-300">{character.ac}</div>
                                    )}
                                </div>
                                <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-center">
                                    <div className="text-xs text-neutral-400 uppercase tracking-wider">INIT</div>
                                    <div className="text-lg font-bold text-neutral-200">{formatModifier(character.initiative || getModifier(abilities.dexterity))}</div>
                                </div>
                            </div>
                            {/* Edit/Save Buttons */}
                            {isDM && !isEditing && (
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Edit
                                </button>
                            )}
                            {isEditing && (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setIsEditing(false)}
                                        className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            )}
                            <button 
                                onClick={onClose}
                                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-neutral-400" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6 space-y-8 custom-scrollbar">
                    {/* Ability Scores */}
                    <section>
                        <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> Ability Scores {isEditing && <span className="text-xs text-indigo-400">(click to edit)</span>}
                        </h4>
                        <div className="grid grid-cols-6 gap-3">
                            <AbilityBox name="Strength" short="STR" score={isEditing ? editData.strength : abilities.strength} isEditing={isEditing} onChangeScore={(v) => updateField('strength', v)} />
                            <AbilityBox name="Dexterity" short="DEX" score={isEditing ? editData.dexterity : abilities.dexterity} isEditing={isEditing} onChangeScore={(v) => updateField('dexterity', v)} />
                            <AbilityBox name="Constitution" short="CON" score={isEditing ? editData.constitution : abilities.constitution} isEditing={isEditing} onChangeScore={(v) => updateField('constitution', v)} />
                            <AbilityBox name="Intelligence" short="INT" score={isEditing ? editData.intelligence : abilities.intelligence} isEditing={isEditing} onChangeScore={(v) => updateField('intelligence', v)} />
                            <AbilityBox name="Wisdom" short="WIS" score={isEditing ? editData.wisdom : abilities.wisdom} isEditing={isEditing} onChangeScore={(v) => updateField('wisdom', v)} />
                            <AbilityBox name="Charisma" short="CHA" score={isEditing ? editData.charisma : abilities.charisma} isEditing={isEditing} onChangeScore={(v) => updateField('charisma', v)} />
                        </div>
                    </section>

                    {/* Two column layout for skills and attacks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Skills */}
                        {((isEditing ? editData.skills : extended?.skills) || []).length > 0 && (
                            <section>
                                <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <User className="w-4 h-4" /> Skills
                                </h4>
                                <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30">
                                    {(isEditing ? editData.skills : extended?.skills || []).map((skill: any, idx: number) => (
                                        isEditing ? (
                                            <div key={idx} className="flex items-center justify-between py-1.5 border-b border-neutral-800/30 last:border-0 gap-2">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateArrayItem('skills', idx, 'proficient', !skill.proficient)}
                                                        className={`w-3 h-3 rounded-full ${skill.proficient ? 'bg-indigo-500' : 'bg-neutral-700'}`}
                                                        title="Toggle proficiency"
                                                    />
                                                    <span className="text-sm text-neutral-300">{skill.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={skill.bonus}
                                                        onChange={(e) => updateArrayItem('skills', idx, 'bonus', parseInt(e.target.value) || 0)}
                                                        className="w-12 text-center text-sm font-mono text-neutral-300 bg-neutral-800 border border-neutral-600 rounded"
                                                    />
                                                    <button onClick={() => removeArrayItem('skills', idx)} className="text-red-500 hover:text-red-400 text-xs">✕</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <SkillItem key={skill.name} {...skill} />
                                        )
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Attacks */}
                        {((isEditing ? editData.attacks : extended?.attacks) || []).length > 0 && (
                            <section>
                                <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Sword className="w-4 h-4" /> Attacks
                                    {isEditing && (
                                        <button 
                                            onClick={() => addArrayItem('attacks', { name: 'New Attack', bonus: '+0', damage: '1d6', damageType: 'slashing' })}
                                            className="ml-auto text-xs bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 rounded"
                                        >+ Add</button>
                                    )}
                                </h4>
                                <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30 space-y-2">
                                    {(isEditing ? editData.attacks : extended?.attacks || []).map((attack: any, idx: number) => (
                                        isEditing ? (
                                            <div key={idx} className="flex items-center gap-2 py-1 border-b border-neutral-800/30 last:border-0">
                                                <input
                                                    type="text"
                                                    value={attack.name}
                                                    onChange={(e) => updateArrayItem('attacks', idx, 'name', e.target.value)}
                                                    className="flex-1 text-sm text-neutral-300 bg-neutral-800 border border-neutral-600 rounded px-2 py-0.5"
                                                    placeholder="Name"
                                                />
                                                <input
                                                    type="text"
                                                    value={attack.bonus}
                                                    onChange={(e) => updateArrayItem('attacks', idx, 'bonus', e.target.value)}
                                                    className="w-14 text-center text-sm font-mono text-amber-400 bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5"
                                                    placeholder="+0"
                                                />
                                                <input
                                                    type="text"
                                                    value={attack.damage}
                                                    onChange={(e) => updateArrayItem('attacks', idx, 'damage', e.target.value)}
                                                    className="w-16 text-center text-sm text-red-300 bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5"
                                                    placeholder="1d6"
                                                />
                                                <button onClick={() => removeArrayItem('attacks', idx)} className="text-red-500 hover:text-red-400 text-sm">✕</button>
                                            </div>
                                        ) : (
                                            <AttackRow key={attack.name} {...attack} />
                                        )
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Traits & Features */}
                    {((isEditing ? editData.traits : extended?.traits) || []).length > 0 && (
                        <section>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Features & Traits
                                {isEditing && (
                                    <button 
                                        onClick={() => addArrayItem('traits', { name: 'New Feature', description: '', source: 'Class', sourceType: '' })}
                                        className="ml-auto text-xs bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 rounded"
                                    >+ Add</button>
                                )}
                            </h4>
                            <div className="grid gap-3 md:grid-cols-2">
                                {(isEditing ? editData.traits : extended?.traits || []).map((trait: any, idx: number) => (
                                    isEditing ? (
                                        <div key={idx} className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30 space-y-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <input
                                                    type="text"
                                                    value={trait.name}
                                                    onChange={(e) => updateArrayItem('traits', idx, 'name', e.target.value)}
                                                    className="flex-1 text-base font-semibold text-white bg-neutral-800 border border-neutral-600 rounded px-2 py-1"
                                                    placeholder="Feature Name"
                                                />
                                                <button onClick={() => removeArrayItem('traits', idx)} className="text-red-500 hover:text-red-400">✕</button>
                                            </div>
                                            <textarea
                                                value={trait.description}
                                                onChange={(e) => updateArrayItem('traits', idx, 'description', e.target.value)}
                                                className="w-full text-sm text-neutral-300 bg-neutral-800 border border-neutral-600 rounded px-2 py-1 min-h-[60px]"
                                                placeholder="Description..."
                                            />
                                        </div>
                                    ) : (
                                        <TraitCard key={trait.name} {...trait} />
                                    )
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Spells */}
                    {((isEditing ? editData.spells : extended?.spells) || []).length > 0 && (
                        <section>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" /> Spells
                                {isEditing && (
                                    <button 
                                        onClick={() => addArrayItem('spells', { name: 'New Spell', level: 0, school: 'evocation', description: '' })}
                                        className="ml-auto text-xs bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 rounded"
                                    >+ Add</button>
                                )}
                            </h4>
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {(isEditing ? editData.spells : extended?.spells || []).map((spell: any, idx: number) => (
                                    isEditing ? (
                                        <div key={idx} className="bg-neutral-950/30 rounded-lg p-3 border border-neutral-800/30 space-y-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <input
                                                    type="text"
                                                    value={spell.name}
                                                    onChange={(e) => updateArrayItem('spells', idx, 'name', e.target.value)}
                                                    className="flex-1 text-sm font-semibold text-white bg-neutral-800 border border-neutral-600 rounded px-2 py-0.5"
                                                />
                                                <select
                                                    value={spell.level}
                                                    onChange={(e) => updateArrayItem('spells', idx, 'level', parseInt(e.target.value))}
                                                    className="text-xs text-indigo-400 bg-neutral-800 border border-neutral-600 rounded px-1"
                                                >
                                                    <option value={0}>Cantrip</option>
                                                    {[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>Level {l}</option>)}
                                                </select>
                                                <button onClick={() => removeArrayItem('spells', idx)} className="text-red-500 hover:text-red-400 text-sm">✕</button>
                                            </div>
                                            <textarea
                                                value={spell.description}
                                                onChange={(e) => updateArrayItem('spells', idx, 'description', e.target.value)}
                                                className="w-full text-xs text-neutral-300 bg-neutral-800 border border-neutral-600 rounded px-2 py-1 min-h-[40px]"
                                                placeholder="Description..."
                                            />
                                        </div>
                                    ) : (
                                        <SpellCard key={spell.name} {...spell} />
                                    )
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Inventory */}
                    {((isEditing ? editData.inventory : extended?.inventory) || []).length > 0 && (
                        <section>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Backpack className="w-4 h-4" /> Inventory
                                {isEditing && (
                                    <button 
                                        onClick={() => addArrayItem('inventory', { name: 'New Item', quantity: 1, weight: 0 })}
                                        className="ml-auto text-xs bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 rounded"
                                    >+ Add</button>
                                )}
                            </h4>
                            <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30 grid md:grid-cols-2 gap-x-8">
                                {(isEditing ? editData.inventory : extended?.inventory || []).map((item: any, idx: number) => (
                                    isEditing ? (
                                        <div key={idx} className="flex items-center gap-2 py-2 border-b border-neutral-800/30 last:border-0">
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => updateArrayItem('inventory', idx, 'name', e.target.value)}
                                                className="flex-1 text-sm text-neutral-300 bg-neutral-800 border border-neutral-600 rounded px-2 py-0.5"
                                            />
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateArrayItem('inventory', idx, 'quantity', parseInt(e.target.value) || 1)}
                                                className="w-12 text-center text-xs text-neutral-400 bg-neutral-800 border border-neutral-600 rounded"
                                                min={1}
                                            />
                                            <button onClick={() => removeArrayItem('inventory', idx)} className="text-red-500 hover:text-red-400 text-sm">✕</button>
                                        </div>
                                    ) : (
                                        <div key={item.name} className="flex items-center justify-between py-2 border-b border-neutral-800/30 last:border-0">
                                            <div className="flex items-center gap-2">
                                                {item.equipped && <Shield className="w-4 h-4 text-indigo-400" />}
                                                <span className="text-sm text-neutral-300">{item.name}</span>
                                                {item.quantity > 1 && <span className="text-xs text-neutral-500">×{item.quantity}</span>}
                                            </div>
                                            {item.properties && <span className="text-xs text-neutral-500">{item.properties}</span>}
                                        </div>
                                    )
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Background */}
                    {(extended?.personalityTraits || extended?.backstory) && (
                        <section>
                            <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Scroll className="w-4 h-4" /> Background & Personality
                            </h4>
                            <div className="grid md:grid-cols-2 gap-4">
                                {extended.personalityTraits && (
                                    <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30">
                                        <span className="text-xs uppercase text-neutral-500 font-semibold">Personality</span>
                                        <p className="text-sm text-neutral-300 mt-2 whitespace-pre-line">{extended.personalityTraits}</p>
                                    </div>
                                )}
                                {extended.ideals && (
                                    <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30">
                                        <span className="text-xs uppercase text-neutral-500 font-semibold">Ideals</span>
                                        <p className="text-sm text-neutral-300 mt-2">{extended.ideals}</p>
                                    </div>
                                )}
                                {extended.bonds && (
                                    <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30">
                                        <span className="text-xs uppercase text-neutral-500 font-semibold">Bonds</span>
                                        <p className="text-sm text-neutral-300 mt-2">{extended.bonds}</p>
                                    </div>
                                )}
                                {extended.flaws && (
                                    <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30">
                                        <span className="text-xs uppercase text-neutral-500 font-semibold">Flaws</span>
                                        <p className="text-sm text-neutral-300 mt-2">{extended.flaws}</p>
                                    </div>
                                )}
                            </div>
                            {extended.backstory && (
                                <div className="bg-neutral-950/30 rounded-lg p-4 border border-neutral-800/30 mt-4">
                                    <span className="text-xs uppercase text-neutral-500 font-semibold">Backstory</span>
                                    <p className="text-sm text-neutral-300 mt-2 whitespace-pre-line leading-relaxed">{extended.backstory}</p>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Languages & Proficiencies */}
                    {(extended?.languages || extended?.proficiencies) && (
                        <section className="grid md:grid-cols-2 gap-6">
                            {extended.languages && (
                                <div>
                                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Languages</h4>
                                    <p className="text-sm text-neutral-400">{extended.languages.join(', ')}</p>
                                </div>
                            )}
                            {extended.proficiencies && (
                                <div>
                                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Proficiencies</h4>
                                    <p className="text-sm text-neutral-400">{extended.proficiencies.map(p => p.name).join(', ')}</p>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

// Compact Card (shown in grid)
export const ExpandableCharacterCard: React.FC<CharacterCardProps> = ({ character, isDM = false, onSave }) => {
    const [isOpen, setIsOpen] = useState(false);
    const abilities = character.abilities || { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };

    return (
        <>
            <div 
                className="group relative bg-neutral-900/40 hover:bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 rounded-lg p-5 transition-all cursor-pointer"
                onClick={() => setIsOpen(true)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {character.avatarUrl ? (
                            <img src={character.avatarUrl} alt={character.name} className="w-12 h-12 rounded-full object-cover border border-neutral-700" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 font-bold text-lg border border-neutral-700">
                                {character.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold text-white text-base">{character.name}</h3>
                            <p className="text-xs text-neutral-400 font-mono mt-0.5">
                                {character.race && `${character.race} `}{character.class}{character.subclass && ` (${character.subclass})`} • Lvl {character.level}
                            </p>
                            {character.background && (
                                <p className="text-xs text-neutral-500 mt-0.5">{character.background}</p>
                            )}
                        </div>
                    </div>
                    <Badge type={character.status === 'active' ? 'success' : 'danger'}>
                        {character.hp}/{character.maxHp} HP
                    </Badge>
                </div>

                {/* Compact Stats Row */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                    <div className="bg-neutral-950/30 rounded p-2 text-center border border-neutral-800/50">
                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold mb-1">HP</div>
                        <div className="text-sm font-mono font-bold text-white">{character.hp}<span className="text-neutral-600">/</span>{character.maxHp}</div>
                    </div>
                    <div className="bg-neutral-950/30 rounded p-2 text-center border border-neutral-800/50">
                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold mb-1">AC</div>
                        <div className="text-sm font-mono font-bold text-white">{character.ac}</div>
                    </div>
                    <div className="bg-neutral-950/30 rounded p-2 text-center border border-neutral-800/50">
                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold mb-1">INIT</div>
                        <div className="text-sm font-mono font-bold text-white">{formatModifier(character.initiative || getModifier(abilities.dexterity))}</div>
                    </div>
                    <div className="bg-neutral-950/30 rounded p-2 text-center border border-neutral-800/50">
                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold mb-1">SPEED</div>
                        <div className="text-sm font-mono font-bold text-white">{character.speed || 30}</div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-neutral-800/50 flex justify-between items-center">
                    <span className="text-xs text-neutral-500 flex items-center gap-1.5">
                        <UserPlus className="w-3 h-3" /> {character.player}
                    </span>
                    <span className="text-xs text-indigo-400 group-hover:text-white transition-colors">
                        View Sheet →
                    </span>
                </div>
            </div>

            {/* Modal */}
            {isOpen && <CharacterSheetModal character={character} onClose={() => setIsOpen(false)} isDM={isDM} onSave={onSave} />}
        </>
    );
};

