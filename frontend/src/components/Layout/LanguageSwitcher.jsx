import { useLanguage } from '../../context/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Globe } from 'lucide-react';

export const LanguageSwitcher = () => {
  const { language, setLanguage, languages } = useLanguage();

  const currentLang = languages.find(l => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        data-testid="language-switcher"
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-sm transition-all"
      >
        <Globe size={16} />
        <span className="hidden sm:inline">{currentLang?.flag} {currentLang?.name}</span>
        <span className="sm:hidden">{currentLang?.flag}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="bg-[#0A0A0A] border-[#27272A] min-w-[150px]"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            data-testid={`lang-${lang.code}`}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-2 cursor-pointer ${
              language === lang.code 
                ? 'text-[#D4AF37] bg-[#D4AF37]/10' 
                : 'text-white hover:bg-[#121212]'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
