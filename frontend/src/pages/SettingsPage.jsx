import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Settings, User, Shield, Bell, Moon, Sun } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(true);

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">SETTINGS</h1>
        <p className="text-[#A1A1AA] text-sm mt-1">Manage your account preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <User size={20} className="text-[#D4AF37]" />
          <h2 className="text-lg font-rajdhani font-bold tracking-wider text-white">PROFILE</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#121212] rounded-sm flex items-center justify-center">
              <span className="text-[#D4AF37] font-bold text-2xl">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">{user?.name}</p>
              <p className="text-[#A1A1AA] text-sm">{user?.email}</p>
              <p className="text-[#52525B] text-xs capitalize mt-1">{user?.role}</p>
            </div>
          </div>

          <div className="grid gap-4 pt-4 border-t border-[#27272A]">
            <div className="space-y-2">
              <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Display Name</Label>
              <Input
                defaultValue={user?.name}
                className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                data-testid="settings-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Email</Label>
              <Input
                type="email"
                defaultValue={user?.email}
                disabled
                className="bg-[#121212] border-[#27272A] text-[#52525B] rounded-sm cursor-not-allowed"
                data-testid="settings-email-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield size={20} className="text-[#D4AF37]" />
          <h2 className="text-lg font-rajdhani font-bold tracking-wider text-white">SECURITY</h2>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Current Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              className="bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] rounded-sm"
              data-testid="settings-current-password"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">New Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              className="bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] rounded-sm"
              data-testid="settings-new-password"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Confirm New Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              className="bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] rounded-sm"
              data-testid="settings-confirm-password"
            />
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell size={20} className="text-[#D4AF37]" />
          <h2 className="text-lg font-rajdhani font-bold tracking-wider text-white">PREFERENCES</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-white font-medium">Email Notifications</p>
              <p className="text-[#52525B] text-xs">Receive email updates about your projects</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              data-testid="notifications-toggle"
              className={`w-12 h-6 rounded-full transition-colors ${
                notifications ? 'bg-[#D4AF37]' : 'bg-[#27272A]'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                notifications ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-[#27272A]">
            <div>
              <p className="text-white font-medium">Dark Mode</p>
              <p className="text-[#52525B] text-xs">Use dark theme across the application</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#D4AF37]/20 rounded-sm">
              <Moon size={14} className="text-[#D4AF37]" />
              <span className="text-[#D4AF37] text-xs font-medium">ENABLED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          data-testid="settings-save-btn"
          className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm px-8"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
