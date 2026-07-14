import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '../api/client';
import { apiBase } from '../api/config';

const TICKETS_API = `${apiBase}/api/app/tickets`;

export interface TicketOption {
  id: number;
  subject: string;
  status?: string;
}

interface TicketSelectorProps {
  value: string;
  onChange: (ticketId: string) => void;
  customerId: string;
  disabled?: boolean;
  className?: string;
}

export const TicketSelector = ({ value, onChange, customerId, disabled, className = '' }: TicketSelectorProps) => {
  const [openTickets, setOpenTickets] = useState<TicketOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TicketOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchOpenTickets = useCallback(async (cid: string) => {
    const id = parseInt(cid, 10);
    if (isNaN(id)) {
      setOpenTickets([]);
      return;
    }
    try {
      const res = await authFetch(`${TICKETS_API}/by-customer?customerId=${id}&status=open`);
      if (!res.ok) return;
      const data = await res.json();
      setOpenTickets(Array.isArray(data) ? data : []);
    } catch {
      setOpenTickets([]);
    }
  }, []);

  useEffect(() => {
    fetchOpenTickets(customerId);
  }, [customerId, fetchOpenTickets]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = await authFetch(`${TICKETS_API}/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) return;
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setShowSearchResults(true);
    searchTimeoutRef.current = setTimeout(() => runSearch(searchQuery), 250);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, runSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectTicket = (id: number) => {
    onChange(String(id));
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const valueNum = value ? parseInt(value, 10) : null;
  const selectedFromOpen = openTickets.find((t) => t.id === valueNum);
  const selectedLabel = selectedFromOpen ? `#${selectedFromOpen.id} ${selectedFromOpen.subject}` : value ? `Ticket #${value}` : null;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="mb-1.5">
        <label className="block text-sm font-medium text-text-muted mb-1">Ticket</label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
          placeholder="Search by ID or subject…"
          disabled={disabled}
          className="input-field w-full text-sm"
        />
      </div>
      {showSearchResults && (searchQuery.trim() || searchResults.length > 0) && (
        <div className="absolute z-20 mt-0 w-full max-h-48 overflow-auto rounded-lg border border-border bg-surface shadow-lg">
          {searching ? (
            <div className="p-2 text-text-muted text-sm">Searching…</div>
          ) : searchResults.length > 0 ? (
            <ul className="py-1">
              {searchResults.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => selectTicket(t.id)}
                    className="w-full text-left px-3 py-2 text-sm text-text hover:bg-surface-elevated"
                  >
                    #{t.id} {t.subject}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-2 text-text-muted text-sm">No tickets found.</div>
          )}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-text-muted mb-1 sr-only">Selected ticket</label>
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || '')}
          disabled={disabled}
          className="input-field w-full"
        >
          <option value="">No ticket</option>
          {openTickets.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.id} {t.subject}
            </option>
          ))}
          {valueNum != null && !openTickets.some((t) => t.id === valueNum) && (
            <option value={value}>
              {selectedLabel ?? `Ticket #${value}`}
            </option>
          )}
        </select>
      </div>
    </div>
  );
};
