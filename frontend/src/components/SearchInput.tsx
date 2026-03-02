import React, { useState, useEffect } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Tag } from '../api/client';

interface SearchInputProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
  availableTags?: Tag[];
  initialQuery?: string;
  initialFilters?: SearchFilters;
}

export interface SearchFilters {
  category?: string;
  vendor?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: 'card' | 'cash' | 'all';
  tags?: number[];
}

const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  placeholder = "Search expenses...",
  className = "",
  showFilters = true,
  availableTags = [],
  initialQuery = '',
  initialFilters
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(
    initialFilters || { paymentMethod: 'all' }
  );

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(query, filters);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, filters, onSearch]);

  const handleClearSearch = () => {
    setQuery('');
    setFilters({ paymentMethod: 'all' });
    onSearch('', { paymentMethod: 'all' });
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'paymentMethod') return value !== 'all';
    if (key === 'tags') return Array.isArray(value) && value.length > 0;
    return value !== undefined && value !== '';
  });

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder={placeholder}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center">
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`p-2 text-gray-400 hover:text-gray-600 transition-colors ${
                hasActiveFilters || showFilterPanel ? 'text-blue-500' : ''
              }`}
              title="Toggle filters"
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
          
          {(query || hasActiveFilters) && (
            <button
              onClick={handleClearSearch}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && showFilters && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Filter by category"
                />
              </div>

              {/* Vendor Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor
                </label>
                <input
                  type="text"
                  value={filters.vendor || ''}
                  onChange={(e) => handleFilterChange('vendor', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Filter by vendor"
                />
              </div>

              {/* Amount Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={filters.minAmount || ''}
                    onChange={(e) => handleFilterChange('minAmount', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={filters.maxAmount || ''}
                    onChange={(e) => handleFilterChange('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={filters.paymentMethod || 'all'}
                  onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All</option>
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        const selectedTags = filters.tags || [];
                        if (selectedTags.includes(tag.id)) {
                          handleFilterChange('tags', selectedTags.filter(id => id !== tag.id));
                        } else {
                          handleFilterChange('tags', [...selectedTags, tag.id]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        (filters.tags || []).includes(tag.id)
                          ? 'text-white border-2'
                          : 'text-gray-800 border-2'
                      }`}
                      style={
                        (filters.tags || []).includes(tag.id)
                          ? { backgroundColor: tag.color, borderColor: tag.color }
                          : { backgroundColor: tag.color + '99', borderColor: tag.color }
                      }
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="pt-2 border-t">
                <button
                  onClick={() => setFilters({ paymentMethod: 'all' })}
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchInput;