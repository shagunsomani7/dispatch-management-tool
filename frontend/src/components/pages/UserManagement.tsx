import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';

interface User {
  _id: string;
  username: string;
  role: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add user form state
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'supervisor' });
  const [addLoading, setAddLoading] = useState(false);

  // Update user state
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('supervisor');
  const [editPassword, setEditPassword] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Add user handler
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiService.registerUser(newUser);
      setSuccess('User added successfully');
      setNewUser({ username: '', password: '', role: 'supervisor' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to add user');
    } finally {
      setAddLoading(false);
    }
  };

  // Start editing a user
  const startEdit = (user: User) => {
    setEditUserId(user._id);
    setEditRole(user.role);
    setEditPassword('');
    setSuccess(null);
    setError(null);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditUserId(null);
    setEditRole('supervisor');
    setEditPassword('');
  };

  // Update user handler
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId) return;
    setUpdateLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiService.updateUser(editUserId, {
        role: editRole,
        password: editPassword || undefined,
      });
      setSuccess('User updated successfully');
      setEditUserId(null);
      setEditRole('supervisor');
      setEditPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      {/* Add User Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add New User</h2>
        <form onSubmit={handleAddUser}>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Username</label>
            <input type="text" className="input-field" placeholder="Enter username" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Password</label>
            <input type="password" className="input-field" placeholder="Enter password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Role</label>
            <select className="input-field" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" disabled={addLoading}>{addLoading ? 'Adding...' : 'Add User'}</button>
        </form>
      </div>
      {/* Success/Error Messages */}
      {success && <div className="text-green-600 mb-4">{success}</div>}
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {/* User List and Update Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Existing Users</h2>
        {loading ? (
          <div>Loading users...</div>
        ) : users.length === 0 ? (
          <div>No users found.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="py-2 px-3 border-b">Username</th>
                <th className="py-2 px-3 border-b">Role</th>
                <th className="py-2 px-3 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td className="py-2 px-3 border-b">{user.username}</td>
                  <td className="py-2 px-3 border-b">{editUserId === user._id ? (
                    <select className="input-field" value={editRole} onChange={e => setEditRole(e.target.value)}>
                      <option value="supervisor">Supervisor</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    user.role
                  )}</td>
                  <td className="py-2 px-3 border-b">
                    {editUserId === user._id ? (
                      <form className="flex items-center space-x-2" onSubmit={handleUpdateUser}>
                        <input type="password" className="input-field" placeholder="New password (optional)" value={editPassword} onChange={e => setEditPassword(e.target.value)} />
                        <button type="submit" className="btn-primary hover:bg-blue-700" disabled={updateLoading}>{updateLoading ? 'Saving...' : 'Save'}</button>
                        <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancel</button>
                      </form>
                    ) : (
                      <button className="btn-primary hover:bg-blue-700" onClick={() => startEdit(user)}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserManagement; 