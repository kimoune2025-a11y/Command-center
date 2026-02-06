import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(formData.email, formData.password, formData.name, formData.role);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      {/* Noise overlay */}
      <div className="noise-overlay" />

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#D4AF37] rounded-sm flex items-center justify-center">
              <span className="text-black font-bold text-xl">CV</span>
            </div>
          </div>
          <h1 className="text-3xl font-rajdhani font-bold tracking-wider text-white">
            REQUEST ACCESS
          </h1>
          <p className="text-[#A1A1AA] text-sm mt-2">Join the Command Center</p>
        </div>

        {/* Register Form */}
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#A1A1AA] text-xs uppercase tracking-wider">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                data-testid="register-name-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Smith"
                required
                className="bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] focus:ring-[#D4AF37] rounded-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#A1A1AA] text-xs uppercase tracking-wider">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                data-testid="register-email-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@company.com"
                required
                className="bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] focus:ring-[#D4AF37] rounded-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#A1A1AA] text-xs uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  data-testid="register-password-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] focus:ring-[#D4AF37] rounded-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525B] hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-[#A1A1AA] text-xs uppercase tracking-wider">
                Requested Role
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger 
                  data-testid="register-role-select"
                  className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] focus:ring-[#D4AF37] rounded-sm"
                >
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                  <SelectItem value="viewer" className="text-white hover:bg-[#121212]">Viewer</SelectItem>
                  <SelectItem value="manager" className="text-white hover:bg-[#121212]">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              data-testid="register-submit-btn"
              disabled={loading}
              className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm h-10"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Creating Account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus size={16} />
                  Create Account
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#27272A] text-center">
            <p className="text-[#52525B] text-sm">
              Already have access?{' '}
              <Link to="/login" className="text-[#D4AF37] hover:underline" data-testid="login-link">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#52525B] text-xs mt-6">
          CVLN Creative Conglomerate © 2024
        </p>
      </div>
    </div>
  );
}
