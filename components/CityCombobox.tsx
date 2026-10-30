'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, ChevronDown, Check } from 'lucide-react';

export interface HubCityItem {
  id: string;
  code: string;
  name: string;
  displayName: string;
  aliases: string[];
  provinceName?: string;
}

// Fallback hub cities in case client hasn't loaded API yet
const DEFAULT_HUBS: HubCityItem[] = [
  { id: 'jkt', code: '31.71', name: 'Kota Jakarta Pusat', displayName: 'Jakarta', aliases: ['jakarta', 'dki', 'jkt'] },
  { id: 'bgr', code: '32.71', name: 'Kota Bogor', displayName: 'Bogor', aliases: ['bogor'] },
  { id: 'bdg', code: '32.73', name: 'Kota Bandung', displayName: 'Bandung', aliases: ['bandung'] },
  { id: 'crb', code: '32.74', name: 'Kota Cirebon', displayName: 'Cirebon', aliases: ['cirebon'] },
  { id: 'tgl', code: '33.76', name: 'Kota Tegal', displayName: 'Tegal', aliases: ['tegal'] },
  { id: 'smg', code: '33.74', name: 'Kota Semarang', displayName: 'Semarang', aliases: ['semarang'] },
  { id: 'yk', code: '34.71', name: 'Kota Yogyakarta', displayName: 'Yogyakarta (Jogja)', aliases: ['jogja', 'yogya', 'yogyakarta', 'diy'] },
  { id: 'slo', code: '33.72', name: 'Kota Surakarta', displayName: 'Surakarta (Solo)', aliases: ['solo', 'surakarta', 'ska'] },
  { id: 'sby', code: '35.78', name: 'Kota Surabaya', displayName: 'Surabaya', aliases: ['surabaya'] },
  { id: 'mlg', code: '35.73', name: 'Kota Malang', displayName: 'Malang', aliases: ['malang'] }
];

interface CityComboboxProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabledValue?: string;
  error?: string;
  className?: string;
}

export default function CityCombobox({
  id,
  label,
  value,
  onChange,
  placeholder = 'Pilih kota...',
  disabledValue,
  error,
  className = ''
}: CityComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<HubCityItem[]>(DEFAULT_HUBS);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/cities/hubs')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.data) && data.data.length > 0) {
          setCities(data.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync internal display when value changes externally
  const selectedCity = cities.find(
    c =>
      c.displayName.toLowerCase() === value.toLowerCase() ||
      c.name.toLowerCase() === value.toLowerCase() ||
      c.aliases.some(a => a.toLowerCase() === value.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCities = cities.filter(c => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.aliases.some(a => a.toLowerCase().includes(q))
    );
  });

  const handleSelect = (city: HubCityItem) => {
    // If user selects "Surakarta (Solo)", we store "Surakarta" or "Solo" appropriately
    const chosenVal = city.name.includes('Surakarta') ? 'Surakarta' :
                      city.name.includes('Jakarta Pusat') ? 'Jakarta' :
                      city.name.includes('Yogyakarta') ? 'Yogyakarta' :
                      city.displayName;
    onChange(chosenVal);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-ink/80 mb-1.5">
          {label}
        </label>
      )}

      <div
        id={id}
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-sm cursor-pointer transition-all ${
          error
            ? 'border-error ring-1 ring-error/20'
            : isOpen
            ? 'border-primary ring-2 ring-primary/15'
            : 'border-borderCol hover:border-muted/50'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          <span className={`truncate ${selectedCity ? 'font-semibold text-ink' : 'text-muted'}`}>
            {selectedCity ? selectedCity.displayName : value || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {error && <p className="text-[11px] text-error mt-1">{error}</p>}

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-borderCol rounded-xl shadow-xl overflow-hidden py-1.5 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-2.5 pb-2 pt-1 border-b border-borderCol/50">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-surface/70 border border-borderCol/70 rounded-lg text-xs">
              <Search className="w-3.5 h-3.5 text-muted flex-shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Cari kota atau alias (e.g. Solo, Jogja)..."
                className="w-full bg-transparent border-none outline-none text-ink placeholder:text-muted/70 text-xs"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto px-1 py-1">
            {filteredCities.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted">
                Kota tidak ditemukan. Coba ketik nama atau alias lain.
              </div>
            ) : (
              filteredCities.map(city => {
                const isSelected = selectedCity?.code === city.code;
                const isDis = Boolean(disabledValue && (
                  city.displayName.toLowerCase() === disabledValue.toLowerCase() ||
                  city.name.toLowerCase() === disabledValue.toLowerCase() ||
                  city.aliases.some(a => a.toLowerCase() === disabledValue.toLowerCase())
                ));

                return (
                  <button
                    key={city.id || city.code}
                    type="button"
                    disabled={isDis}
                    onClick={e => {
                      e.stopPropagation();
                      if (!isDis) handleSelect(city);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs rounded-lg transition-colors ${
                      isDis
                        ? 'opacity-40 cursor-not-allowed bg-surface/40'
                        : isSelected
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'hover:bg-surface text-ink'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{city.displayName}</span>
                      {city.displayName !== city.name && (
                        <span className="text-[10px] text-muted">{city.name}</span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
