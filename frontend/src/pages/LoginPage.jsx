import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from '../components/Layout/LanguageSwitcher';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t('auth.welcomeBack') + '!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      {/* Noise overlay */}
      <div className="noise-overlay" />
      
      {/* Language switcher */}
      <div className="fixed top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#D4AF37] rounded-sm flex items-center justify-center">
              <span className="text-black font-bold text-xl">CV</span>
            </div>
          </div>
          <h1 className="text-3xl font-rajdhani font-bold tracking-wider text-white">
            {t('branding.commandCenter').toUpperCase()}
          </h1>
          <p className="text-[#A1A1AA] text-sm mt-2">{t('branding.executiveControlPanel')}</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#A1A1AA] text-xs uppercase tracking-wider">
                {t('auth.email')}
              </Label>
              <Input
                id="email"
                type="email"
                data-testid="login-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] focus:ring-[#D4AF37] rounded-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#A1A1AA] text-xs uppercase tracking-wider">
                {t('auth.password')}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  data-testid="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <Button
              type="submit"
              data-testid="login-submit-btn"
              disabled={loading}
              className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm h-10"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  {t('auth.authenticating')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={16} />
                  {t('auth.accessCommandCenter')}
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#27272A] text-center">
            <p className="text-[#52525B] text-sm">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-[#D4AF37] hover:underline" data-testid="register-link">
                {t('auth.requestAccess')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#52525B] text-xs mt-6">
          {t('branding.copyright')}
        </p>
      </div>
    </div>
  );
}
