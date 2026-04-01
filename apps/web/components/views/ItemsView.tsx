import React, { useState } from 'react';
import { Package, Plus, X, Users, Star, Sword, Shield, Sparkles, Gem, HelpCircle } from 'lucide-react';
import { CampaignData, Item, ItemRarity, ItemCategory } from '../../types';

interface ItemsViewProps {
    data: CampaignData;
    isDM: boolean;
    onAddItem?: (item: Omit<Item, 'id'>) => Promise<void>;
}

const RARITY_COLORS: Record<ItemRarity, string> = {
    common: 'text-neutral-400 border-neutral-600',
    uncommon: 'text-green-400 border-green-600',
    rare: 'text-blue-400 border-blue-600',
    very_rare: 'text-purple-400 border-purple-600',
    legendary: 'text-orange-400 border-orange-600',
    artifact: 'text-red-400 border-red-600',
};

const RARITY_LABELS: Record<ItemRarity, string> = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    very_rare: 'Very Rare',
    legendary: 'Legendary',
    artifact: 'Artifact',
};

const CATEGORY_ICONS: Record<ItemCategory, React.ComponentType<{ className?: string }>> = {
    weapon: Sword,
    armor: Shield,
    consumable: Sparkles,
    wondrous: Star,
    treasure: Gem,
    misc: HelpCircle,
};

export const ItemsView: React.FC<ItemsViewProps> = ({ data, isDM, onAddItem }) => {
    const [showModal, setShowModal] = useState(false);
    const [filterCategory, setFilterCategory] = useState<ItemCategory | 'all'>('all');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'misc' as ItemCategory,
        rarity: 'common' as ItemRarity,
        quantity: 1,
        characterId: null as string | null,
        notes: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredItems = filterCategory === 'all'
        ? data.items
        : data.items.filter(item => item.category === filterCategory);

    const partyItems = filteredItems.filter(item => !item.characterId);
    const characterItems = filteredItems.filter(item => item.characterId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !onAddItem) return;

        setIsSubmitting(true);
        try {
            await onAddItem({
                ...formData,
                isEquipped: false,
            });
            setFormData({
                name: '',
                description: '',
                category: 'misc',
                rarity: 'common',
                quantity: 1,
                characterId: null,
                notes: '',
            });
            setShowModal(false);
        } catch (error) {
            console.error('Failed to add item:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const ItemCard: React.FC<{ item: Item }> = ({ item }) => {
        const CategoryIcon = CATEGORY_ICONS[item.category];
        return (
            <div className="group bg-neutral-900/40 hover:bg-neutral-900/80 border border-neutral-800 rounded-lg p-4 transition-all">
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center border ${RARITY_COLORS[item.rarity]}`}>
                        <CategoryIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className={`font-bold text-sm truncate ${RARITY_COLORS[item.rarity].split(' ')[0]}`}>
                                {item.name}
                            </h3>
                            {item.quantity > 1 && (
                                <span className="text-xs bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">
                                    x{item.quantity}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                            {RARITY_LABELS[item.rarity]} • {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                        </p>
                    </div>
                    {item.isEquipped && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                            Equipped
                        </span>
                    )}
                </div>
                {item.description && (
                    <p className="mt-2 text-xs text-neutral-400 line-clamp-2">{item.description}</p>
                )}
                {item.notes && (
                    <p className="mt-1 text-[10px] text-indigo-400 italic">{item.notes}</p>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Items</h1>
                    <p className="text-sm text-neutral-400 mt-1">{data.items.length} items in your campaign</p>
                </div>
                {isDM && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Item
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {(['all', 'weapon', 'armor', 'consumable', 'wondrous', 'treasure', 'misc'] as const).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilterCategory(cat)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors whitespace-nowrap ${
                            filterCategory === cat
                                ? 'bg-indigo-600 text-white'
                                : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                    >
                        {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
            </div>

            {/* Party Items Section */}
            {partyItems.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-neutral-300 mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Party Loot
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {partyItems.map(item => <ItemCard key={item.id} item={item} />)}
                    </div>
                </div>
            )}

            {/* Character Items Section */}
            {characterItems.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-neutral-300 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Character Inventory
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {characterItems.map(item => (
                            <div key={item.id}>
                                <ItemCard item={item} />
                                {item.characterName && (
                                    <p className="text-[10px] text-neutral-500 mt-1 pl-1">
                                        Held by: {item.characterName}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.items.length === 0 && (
                <div className="text-center py-16">
                    <Package className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                    <p className="text-neutral-400">No items yet</p>
                    {isDM && <p className="text-sm text-neutral-500 mt-1">Click "Add Item" to add your first item</p>}
                </div>
            )}

            {/* Add Item Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-900">
                            <h2 className="text-lg font-bold text-white">Add New Item</h2>
                            <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="Enter item name"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-1">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="weapon">Weapon</option>
                                        <option value="armor">Armor</option>
                                        <option value="consumable">Consumable</option>
                                        <option value="wondrous">Wondrous</option>
                                        <option value="treasure">Treasure</option>
                                        <option value="misc">Misc</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-1">Rarity</label>
                                    <select
                                        value={formData.rarity}
                                        onChange={(e) => setFormData({ ...formData, rarity: e.target.value as ItemRarity })}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="common">Common</option>
                                        <option value="uncommon">Uncommon</option>
                                        <option value="rare">Rare</option>
                                        <option value="very_rare">Very Rare</option>
                                        <option value="legendary">Legendary</option>
                                        <option value="artifact">Artifact</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-neutral-400 mb-1">Owner</label>
                                    <select
                                        value={formData.characterId || ''}
                                        onChange={(e) => setFormData({ ...formData, characterId: e.target.value || null })}
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Party Loot</option>
                                        {data.party.map(char => (
                                            <option key={char.id} value={char.id}>{char.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 min-h-[80px]"
                                    placeholder="Physical description..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">Notes / Effects</label>
                                <input
                                    type="text"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="Magical properties, mechanics..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !formData.name.trim()}
                                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    {isSubmitting ? 'Adding...' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
