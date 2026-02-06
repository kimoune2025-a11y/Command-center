import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../ui/input';
import { Search, X, FolderKanban, CheckSquare, Users, Calendar, FileText, StickyNote } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const entityIcons = {
  projects: FolderKanban,
  tasks: CheckSquare,
  contacts: Users,
  events: Calendar,
  documents: FileText,
  notes: StickyNote
};

const entityRoutes = {
  projects: '/projects',
  tasks: '/tasks',
  contacts: '/contacts',
  events: '/events',
  documents: '/documents',
  notes: '/projects'
};

export const GlobalSearch = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults(null);
        return;
      }
      
      setLoading(true);
      try {
        const response = await axios.get(`${API}/search?q=${encodeURIComponent(query)}`);
        setResults(response.data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (type, item) => {
    navigate(entityRoutes[type]);
    onClose?.();
  };

  const totalResults = results 
    ? Object.values(results).reduce((acc, arr) => acc + arr.length, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20">
      <div 
        className="w-full max-w-2xl bg-[#0A0A0A] border border-[#27272A] rounded-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-[#27272A]">
          <Search size={20} className="text-[#D4AF37]" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher partout..."
            className="flex-1 bg-transparent border-0 text-white text-lg placeholder:text-[#52525B] focus:ring-0 focus-visible:ring-0"
            data-testid="global-search-input"
          />
          <button
            onClick={onClose}
            className="p-1 text-[#52525B] hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!loading && query.length >= 2 && totalResults === 0 && (
            <div className="p-8 text-center text-[#52525B]">
              Aucun résultat pour "{query}"
            </div>
          )}

          {!loading && results && Object.entries(results).map(([type, items]) => {
            if (items.length === 0) return null;
            const Icon = entityIcons[type];
            
            return (
              <div key={type} className="border-b border-[#27272A] last:border-0">
                <div className="px-4 py-2 bg-[#121212]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA]">
                    {type} ({items.length})
                  </span>
                </div>
                {items.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(type, item)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#D4AF37]/5 transition-colors"
                  >
                    <Icon size={16} className="text-[#D4AF37]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {item.name || item.title}
                      </p>
                      {item.description && (
                        <p className="text-[#52525B] text-sm truncate">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {item.status && (
                      <span className="text-xs text-[#A1A1AA] capitalize">
                        {item.status}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[#27272A] text-xs text-[#52525B]">
          <kbd className="px-1.5 py-0.5 bg-[#121212] rounded">ESC</kbd> pour fermer
        </div>
      </div>
    </div>
  );
};
