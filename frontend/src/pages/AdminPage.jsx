import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Shield, Users, Trash2, UserCog, Crown, Eye, Briefcase } from 'lucide-react';

const roleOptions = [
  { value: 'admin', label: 'Admin', icon: Crown, color: '#D4AF37', description: 'Full access' },
  { value: 'manager', label: 'Manager', icon: Briefcase, color: '#10B981', description: 'Create & edit' },
  { value: 'viewer', label: 'Viewer', icon: Eye, color: '#3B82F6', description: 'Read only' }
];

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await usersAPI.updateRole(userId, newRole);
      toast.success('Role updated successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update role');
    }
  };

  const handleDelete = async (userId) => {
    if (userId === user.id) {
      toast.error("You can't delete your own account");
      return;
    }
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await usersAPI.delete(userId);
      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const getRoleBadge = (role) => {
    const opt = roleOptions.find(r => r.value === role);
    const Icon = opt?.icon || Eye;
    return (
      <span 
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium uppercase tracking-wider"
        style={{ backgroundColor: `${opt?.color}20`, color: opt?.color }}
      >
        <Icon size={12} />
        {opt?.label}
      </span>
    );
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield size={64} className="mx-auto text-[#27272A] mb-4" />
          <h2 className="text-xl font-rajdhani font-bold text-white mb-2">ACCESS DENIED</h2>
          <p className="text-[#52525B]">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">ADMIN PANEL</h1>
        <p className="text-[#A1A1AA] text-sm mt-1">Manage users and roles</p>
      </div>

      {/* Role Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {roleOptions.map(role => {
          const Icon = role.icon;
          return (
            <div 
              key={role.value}
              className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="p-2 rounded-sm"
                  style={{ backgroundColor: `${role.color}20` }}
                >
                  <Icon size={18} style={{ color: role.color }} />
                </div>
                <div>
                  <p className="font-medium text-white">{role.label}</p>
                  <p className="text-[#52525B] text-xs">{role.description}</p>
                </div>
              </div>
              <p className="text-[#A1A1AA] text-xs">
                {users.filter(u => u.role === role.value).length} users
              </p>
            </div>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm" data-testid="users-table">
        <div className="p-4 border-b border-[#27272A]">
          <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white flex items-center gap-2">
            <Users size={18} className="text-[#D4AF37]" />
            USER MANAGEMENT
          </h3>
        </div>
        
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-[#121212] rounded-sm animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <Users size={48} className="mx-auto text-[#27272A] mb-4" />
            <p className="text-[#52525B]">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#27272A]">
                  <th className="text-left py-3 px-4 text-[#A1A1AA] text-xs uppercase tracking-wider font-semibold">User</th>
                  <th className="text-left py-3 px-4 text-[#A1A1AA] text-xs uppercase tracking-wider font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-[#A1A1AA] text-xs uppercase tracking-wider font-semibold">Role</th>
                  <th className="text-right py-3 px-4 text-[#A1A1AA] text-xs uppercase tracking-wider font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr 
                    key={u.id} 
                    data-testid={`user-row-${u.id}`}
                    className="border-b border-[#27272A] hover:bg-[#D4AF37]/5"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#121212] rounded-sm flex items-center justify-center">
                          <span className="text-[#D4AF37] font-bold text-sm">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{u.name}</p>
                          {u.id === user.id && (
                            <span className="text-[#D4AF37] text-xs">(You)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#A1A1AA] text-sm">{u.email}</td>
                    <td className="py-3 px-4">
                      {u.id === user.id ? (
                        getRoleBadge(u.role)
                      ) : (
                        <Select 
                          value={u.role} 
                          onValueChange={(value) => handleRoleChange(u.id, value)}
                        >
                          <SelectTrigger 
                            data-testid={`role-select-${u.id}`}
                            className="w-32 bg-[#121212] border-[#27272A] text-white rounded-sm h-8"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                            {roleOptions.map(role => (
                              <SelectItem 
                                key={role.value} 
                                value={role.value} 
                                className="text-white hover:bg-[#121212]"
                              >
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          data-testid={`delete-user-${u.id}`}
                          className="p-1.5 text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
