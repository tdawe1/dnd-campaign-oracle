import React, { useState } from 'react';
import { UserCircle, Plus, MapPin, X, Pencil, Trash2 } from 'lucide-react';
import { CampaignData, NPC } from '../../types';

interface NPCsViewProps {
    data: CampaignData;
    isDM: boolean;
    onAddNPC?: (npc: Omit<NPC, 'id'>) => Promise<void>;
    onUpdateNPC?: (npcId: string, data: Partial<NPC>) => Promise<void>;
    onDeleteNPC?: (npcId: string) => Promise<void>;
}

export const NPCsView: React.FC<NPCsViewProps> = ({ data, isDM, onAddNPC, onUpdateNPC, onDeleteNPC }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingNPC, setEditingNPC] = useState<NPC | null>(null);
    const [formData, setFormData] = useState({ name: '', location: '', notes: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        
        setIsSubmitting(true);
        try {
            if (editingNPC && onUpdateNPC) {
                await onUpdateNPC(editingNPC.id, formData);
            } else if (onAddNPC) {
                await onAddNPC(formData);
            }
            setFormData({ name: '', location: '', notes: '' });
            setEditingNPC(null);
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save NPC:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (npc: NPC) => {
        setEditingNPC(npc);
        setFormData({ name: npc.name, location: npc.location || '', notes: npc.notes || '' });
        setShowModal(true);
    };

    const handleDelete = async (npcId: string) => {
        if (!onDeleteNPC || !confirm('Are you sure you want to delete this NPC?')) return;
        try {
            await onDeleteNPC(npcId);
        } catch (error) {
            console.error('Failed to delete NPC:', error);
        }
    };

    const openAddModal = () => {
        setEditingNPC(null);
        setFormData({ name: '', location: '', notes: '' });
        setShowModal(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">NPCs</h1>
                    <p className="text-sm text-neutral-400 mt-1">{data.npcs.length} characters in your world</p>
                </div>
                {isDM && (
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add NPC
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.npcs.map((npc) => (
                    <div key={npc.id} className="group bg-neutral-900/40 hover:bg-neutral-900/80 border border-neutral-800 rounded-lg p-5 transition-all relative">
                        {isDM && (
                            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(npc)}
                                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition-colors"
                                    title="Edit NPC"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(npc.id)}
                                    className="p-1.5 bg-neutral-800 hover:bg-red-900/50 rounded text-neutral-400 hover:text-red-400 transition-colors"
                                    title="Delete NPC"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 border border-neutral-700">
                                {npc.imageUrl ? (
                                    <img src={npc.imageUrl} alt={npc.name} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <UserCircle className="w-6 h-6" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-white text-base truncate">{npc.name}</h3>
                                {npc.location && (
                                    <p className="text-xs text-neutral-400 flex items-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3" />
                                        {npc.location}
                                    </p>
                                )}
                            </div>
                        </div>
                        {npc.notes && (
                            <p className="mt-4 text-sm text-neutral-400 line-clamp-3">{npc.notes}</p>
                        )}
                    </div>
                ))}
            </div>

            {data.npcs.length === 0 && (
                <div className="text-center py-16">
                    <UserCircle className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                    <p className="text-neutral-400">No NPCs yet</p>
                    {isDM && <p className="text-sm text-neutral-500 mt-1">Click "Add NPC" to create your first character</p>}
                </div>
            )}

            {/* Add/Edit NPC Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                            <h2 className="text-lg font-bold text-white">{editingNPC ? 'Edit NPC' : 'Add New NPC'}</h2>
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
                                    placeholder="Enter NPC name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="Where can they be found?"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-400 mb-1">Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 min-h-[100px]"
                                    placeholder="Description, personality, connections..."
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
                                    {isSubmitting ? 'Saving...' : (editingNPC ? 'Save Changes' : 'Add NPC')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
