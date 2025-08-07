import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';

interface Material {
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
        <div className={`flex items-center mb-4 ${color}`}>{icon}{title && <h3 className="text-xl font-bold ml-1">{title}</h3>}</div>
        <div className="mb-4">{content}</div>
        <div className="flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
};

const Materials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
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
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getMaterials();
      setMaterials(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load materials');
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
        content: 'Material name is required.',
        actions: [<button key="ok" className="btn-primary" onClick={() => setModal({ open: false })}>OK</button>]
      });
      return;
    }
    try {
      setFormLoading(true);
      if (editingMaterial) {
        await apiService.updateMaterial(editingMaterial._id, formData.name);
        setModal({
          open: true,
          type: 'success',
          title: 'Material Updated',
          content: `Material "${formData.name}" has been updated successfully.`,
          actions: [<button key="ok" className="btn-primary" onClick={() => setModal({ open: false })}>OK</button>]
        });
      } else {
        await apiService.createMaterial(formData.name);
        setModal({
          open: true,
          type: 'success',
          title: 'Material Created',
          content: `Material "${formData.name}" has been created successfully.`,
          actions: [<button key="ok" className="btn-primary" onClick={() => setModal({ open: false })}>OK</button>]
        });
      }
      setFormData({ name: '' });
      setEditingMaterial(null);
      setShowForm(false);
      await loadMaterials();
    } catch (err: any) {
      setModal({
        open: true,
        type: 'error',
        title: 'Error',
        content: err.message || 'Failed to save material.',
        actions: [<button key="ok" className="btn-primary" onClick={() => setModal({ open: false })}>OK</button>]
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({ name: material.name });
    setShowForm(true);
  };

  const handleDelete = async (material: Material) => {
    setModal({
      open: true,
      type: 'confirm',
      title: 'Delete Material',
      content: `Are you sure you want to delete the material "${material.name}"? This action cannot be undone.`,
      actions: [
        <button 
          key="delete" 
          className="btn-danger" 
          onClick={async () => {
            try {
              await apiService.deleteMaterial(material._id);
              setModal({
                open: true,
                type: 'success',
                title: 'Material Deleted',
                content: `Material "${material.name}" has been deleted successfully.`,
                actions: [<button key="ok" className="btn-primary" onClick={() => setModal({ open: false })}>OK</button>]
              });
              await loadMaterials();
            } catch (err: any) {
              setModal({
                open: true,
                type: 'error',
                title: 'Error',
                content: err.message || 'Failed to delete material.',
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
    setEditingMaterial(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Material Management</h1>
          <p className="text-gray-600 mt-2">Manage material names used in dispatch forms</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Add New Material</span>
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
            {editingMaterial ? 'Edit Material' : 'Add New Material'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="materialName" className="block text-sm font-medium text-gray-700 mb-2">
                Material Name *
              </label>
              <input
                type="text"
                id="materialName"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                className="input-field w-full"
                placeholder="Enter material name"
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
                {formLoading ? 'Saving...' : editingMaterial ? 'Update Material' : 'Add Material'}
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
      {/* Materials List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            All Materials ({materials.length})
          </h2>
        </div>
        {materials.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No materials found</h3>
            <p className="text-gray-600">Get started by adding your first material.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material Name
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
                {materials.map((material) => (
                  <tr key={material._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{material.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(material.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(material.updatedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(material)}
                          className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
                          title="Edit material"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(material)}
                          className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                          title="Delete material"
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

export default Materials;