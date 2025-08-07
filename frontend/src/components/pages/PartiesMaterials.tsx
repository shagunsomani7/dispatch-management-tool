import React, { useState } from 'react';
import Parties from './Parties';
import Materials from './Materials';

const PartiesMaterials: React.FC = () => {
  const [tab, setTab] = useState<'parties' | 'materials'>('parties');

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6">
      <div className="flex border-b mb-6">
        <button
          className={`px-6 py-2 font-semibold border-b-2 transition-colors ${tab === 'parties' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
          onClick={() => setTab('parties')}
        >
          Parties
        </button>
        <button
          className={`ml-2 px-6 py-2 font-semibold border-b-2 transition-colors ${tab === 'materials' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
          onClick={() => setTab('materials')}
        >
          Materials
        </button>
      </div>
      <div>
        {tab === 'parties' && <Parties />}
        {tab === 'materials' && <Materials />}
      </div>
    </div>
  );
};

export default PartiesMaterials;