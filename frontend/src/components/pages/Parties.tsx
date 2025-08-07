import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

interface Party {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ModalProps {
  open: boolean;
  type?: 'success' | 'error' | 'confirm';
  title?: string;
  content?: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ open, type = 'confirm', title, content, actions, onClose }) => {
  if (!open) return null;
  
  let icon = null;
  let color = '';
  if (type === 'success') {
    icon = <span className="text-green-600 text-2xl mr-2">✔️</span>;
    color = 'text-green-700';
  } else if (type === 'error') {
    icon = <span className="text-red-600 text-2xl mr-2">❌</span>;
    color = 'text-red-700';
  } else {
    icon = <span className="text-blue-600 text-2xl mr-2">ℹ️</span>;
    color = 'text-blue-700';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className={`flex items-center mb-4 ${color}`}>
          {icon}
          {title && <h3 className="text-xl font-bold ml-1">{title}</h3>}
        </div>
        <div className="mb-4">{content}</div>
        <div className="flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
};

const Parties: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{
    open: boolean;
    type?: 'success' | 'error' | 'confirm';
    title?: string;
    content?: React.ReactNode;
    actions?: React.ReactNode;
  }>({ open: false });

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [formLoading, setFormLoading] = useState(false);

  // Load parties on component mount
  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getParties();
      setParties(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModal({
        open: true,
        type: 'error',
        title: 'Validation Error',
        content: 'Party name is required.',
        actions: [<button key="ok" className="btn-primary" onClick={() => setModal({ open: false })}>OK</button>]
      });
      return;
    }

    try {
      setFormLoading(true);
      if (editingParty) {
        // Update existing party
        await apiService.updateParty(editingParty._id, formData.name);
        setModal({
          open: true,
          type: 'success',
          title: 'Party Updated',
          content: `Party "${formData.name}" has been updated successfully.`,
          actions: [<button key="ok" className="btn-primary" onClick={() => setModal({ open: false })}>OK</button>]
        });
      } else {
        // Create new party
        await apiService.createParty(formData.name);
        setModal({
          open: true,
          type: 'success',
          title: 'Party Created',
          content: `Party "${formData.name}" has been created successfully.`,
          actions: [<button key="ok" className="btn-primary" onClick={() => setModal({ open: false })}>OK</button>]
        });
      }
      
      // Reset form and reload parties
      setFormData({ name: '' });
      setEditingParty(null);
      setShowForm(false);
      await loadParties();
    } catch (err: any) {
      setModal({
        open: true,
        type: 'error',
        title: 'Error',
        content: err.message || 'Failed to save party.',
        actions: [<button key="ok" className="btn-primary" onClick={() => setModal({ open: false })}>OK</button>]
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (party: Party) => {
    setEditingParty(party);
    setFormData({ name: party.name });
    setShowForm(true);
  };

  const handleDelete = async (party: Party) => {
    setModal({
      open: true,
      type: 'confirm',
      title: 'Delete Party',
      content: `Are you sure you want to delete the party "${party.name}"? This action cannot be undone.`,
      actions: [
        <button 
          key="delete" 
          className="btn-danger" 
          onClick={async () => {
            try {
              await apiService.deleteParty(party._id);
              setModal({
                open: true,
                type: 'success',
                title: 'Party Deleted',
                content: `Party "${party.name}" has been deleted successfully.`,
                actions: [<button key="ok" className="btn-primary" onClick={() => setModal({ open: false })}>OK</button>]
              });
              await loadParties();
            } catch (err: any) {
              setModal({
                open: true,
                type: 'error',
                title: 'Error',
                content: err.message || 'Failed to delete party.',
                actions: [<button key="ok" className="btn-primary" onClick={() => setModal({ open: false })}>OK</button>]
              });
            }
          }}
        >
          Delete
        </button>,
        <button key="cancel" className="btn-secondary" onClick={() => setModal({ open: false })}>
          Cancel
        </button>
      ]
    });
  };

  const handleCancel = () => {
    setFormData({ name: '' });
    setEditingParty(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Party Management</h1>
          <p className="text-gray-600 mt-2">Manage party names used in dispatch forms</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Add New Party</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-600 text-xl">❌</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingParty ? 'Edit Party' : 'Add New Party'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="partyName" className="block text-sm font-medium text-gray-700 mb-2">
                Party Name *
              </label>
              <input
                type="text"
                id="partyName"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                className="input-field w-full"
                placeholder="Enter party name"
                maxLength={100}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formLoading}
                className="btn-primary"
              >
                {formLoading ? 'Saving...' : editingParty ? 'Update Party' : 'Add Party'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary"
                disabled={formLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Parties List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            All Parties ({parties.length})
          </h2>
        </div>
        
        {parties.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No parties found</h3>
            <p className="text-gray-600">Get started by adding your first party.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parties.map((party) => (
                  <tr key={party._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{party.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(party.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(party.updatedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(party)}
                          className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
                          title="Edit party"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(party)}
                          className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                          title="Delete party"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        content={modal.content}
        actions={modal.actions}
        onClose={() => setModal({ open: false })}
      />
    </div>
  );
};

export default Parties; 