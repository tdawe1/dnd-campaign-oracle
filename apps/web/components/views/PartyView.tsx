import React from 'react';
import { Plus } from 'lucide-react';
import { CampaignData } from '../../types';
import { ExpandableCharacterCard } from './ExpandableCharacterCard';

interface PartyViewProps {
    data: CampaignData;
    isDM: boolean;
    onSaveCharacter?: (characterId: string, data: any) => void;
}

export const PartyView: React.FC<PartyViewProps> = ({ data, isDM, onSaveCharacter }) => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {data.party.map((char) => (
            <ExpandableCharacterCard 
                key={char.id} 
                character={char} 
                isDM={isDM}
                onSave={onSaveCharacter}
            />
        ))}
        {isDM && (
            <button className="h-full min-h-[200px] border border-dashed border-neutral-800 rounded-lg flex flex-col items-center justify-center gap-3 text-neutral-500 hover:bg-neutral-900/40 hover:border-neutral-700 hover:text-neutral-300 transition-all">
                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Create Character</span>
            </button>
        )}
    </div>
);
