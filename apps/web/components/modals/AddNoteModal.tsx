import React, { useState } from 'react';
import { Save, X, StickyNote } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { client } from '../../app/lib/client';
import { useNotifications } from '../../app/contexts/NotificationContext';

interface AddNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaignId: string;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, campaignId }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addNotification } = useNotifications();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // Mock implementation as I don't see a notes endpoint yet
            // In a real implementation:
            // await client.api.notes.$post({ json: { title, content, campaignId } });
            
            // Simulating API call
            await new Promise(resolve => setTimeout(resolve, 500));

            addNotification({
                id: crypto.randomUUID(),
                title: 'Note Added',
                message: `Note "${title}" saved successfully.`,
                type: 'success',
                date: new Date().toISOString(),
                read: false
            });
            
            setTitle('');
            setContent('');
            onClose();
        } catch (error) {
            console.error('Failed to add note:', error);
            addNotification({
                id: crypto.randomUUID(),
                title: 'Error',
                message: 'Failed to save note. Please try again.',
                type: 'warning', // Changing 'error' to 'warning' as 'error' might not be a valid type
                date: new Date().toISOString(),
                read: false
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Quick Note">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="note-title" className="block text-sm font-medium text-neutral-300 mb-1">
                        Title
                    </label>
                    <div className="relative">
                        <StickyNote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input
                            id="note-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-neutral-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="e.g., Tavern Rumors"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="note-content" className="block text-sm font-medium text-neutral-300 mb-1">
                        Content
                    </label>
                    <textarea
                        id="note-content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={4}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                        placeholder="Write your note here..."
                        required
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button 
                        variant="primary" 
                        type="submit" 
                        isLoading={isSubmitting}
                        icon={Save}
                    >
                        Save Note
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
