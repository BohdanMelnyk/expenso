import React, { useState, useEffect, useRef } from 'react';
import { vendorAPI, Vendor } from '../api/client';

interface VendorSelectorProps {
  selectedVendorId: number;
  onVendorSelect: (vendorId: number) => void;
  className?: string;
  required?: boolean;
  error?: boolean;
}

const VendorSelector: React.FC<VendorSelectorProps> = ({
  selectedVendorId,
  onVendorSelect,
  className = '',
  required = false,
  error = false
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    // Update search term when selected vendor changes
    const selectedVendor = vendors.find(v => v.id === selectedVendorId);
    if (selectedVendor && !isOpen) {
      setSearchTerm(selectedVendor.name);
    } else if (selectedVendorId === 0 && !isOpen) {
      setSearchTerm('');
    }
  }, [selectedVendorId, vendors, isOpen]);

  useEffect(() => {
    // Filter vendors based on search term
    if (searchTerm.trim() === '') {
      setFilteredVendors(vendors);
    } else {
      const filtered = vendors.filter(vendor =>
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVendors(filtered);
    }
    setSelectedIndex(-1);
  }, [searchTerm, vendors]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search term to selected vendor name if no selection made
        const selectedVendor = vendors.find(v => v.id === selectedVendorId);
        if (selectedVendor) {
          setSearchTerm(selectedVendor.name);
        } else if (selectedVendorId === 0) {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [vendors, selectedVendorId]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await vendorAPI.getVendors();
      const sortedVendors = response.data.sort((a, b) => a.name.localeCompare(b.name));
      setVendors(sortedVendors);
      setFilteredVendors(sortedVendors);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
    
    // Clear selection if input is cleared
    if (value === '' && selectedVendorId !== 0) {
      onVendorSelect(0);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // Select all text when focusing
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleVendorSelect = (vendor: Vendor) => {
    onVendorSelect(vendor.id);
    setSearchTerm(vendor.name);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredVendors.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredVendors.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredVendors.length) {
          handleVendorSelect(filteredVendors[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        // Reset to selected vendor
        const selectedVendor = vendors.find(v => v.id === selectedVendorId);
        setSearchTerm(selectedVendor ? selectedVendor.name : '');
        break;
    }
  };

  const getVendorTypeLabel = (type: string) => {
    const typeLabels: { [key: string]: string } = {
      care: 'Care',
      car: 'Car',
      clothing: 'Clothing',
      eating_out: 'Eating Out',
      else: 'Other',
      food_store: 'Food Store',
      household: 'Household',
      living: 'Living',
      salary: 'Salary',
      subscriptions: 'Subscriptions',
      transport: 'Transport',
      tourism: 'Tourism',
    };
    return typeLabels[type] || type;
  };

  const getVendorTypeColor = (type: string) => {
    const typeColors: { [key: string]: string } = {
      care: 'bg-pink-100 text-pink-800',
      car: 'bg-blue-100 text-blue-800',
      clothing: 'bg-purple-100 text-purple-800',
      eating_out: 'bg-orange-100 text-orange-800',
      else: 'bg-gray-100 text-gray-800',
      food_store: 'bg-green-100 text-green-800',
      household: 'bg-yellow-100 text-yellow-800',
      living: 'bg-indigo-100 text-indigo-800',
      salary: 'bg-emerald-100 text-emerald-800',
      subscriptions: 'bg-red-100 text-red-800',
      transport: 'bg-cyan-100 text-cyan-800',
      tourism: 'bg-teal-100 text-teal-800',
    };
    return typeColors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder="Type to search vendors..."
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error 
            ? 'border-red-300 focus:ring-red-500' 
            : 'border-gray-300'
        }`}
        required={required}
        autoComplete="off"
      />

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-gray-500">Loading vendors...</div>
          ) : filteredVendors.length === 0 ? (
            <div className="px-3 py-2 text-gray-500">
              {searchTerm.trim() === '' ? 'Start typing to search vendors' : 'No vendors found'}
            </div>
          ) : (
            filteredVendors.map((vendor, index) => (
              <div
                key={vendor.id}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                } ${selectedVendorId === vendor.id ? 'bg-blue-100' : ''}`}
                onClick={() => handleVendorSelect(vendor)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{vendor.name}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVendorTypeColor(vendor.type)}`}>
                  {getVendorTypeLabel(vendor.type)}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Show selected vendor info when closed */}
      {!isOpen && selectedVendorId > 0 && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {(() => {
            const selectedVendor = vendors.find(v => v.id === selectedVendorId);
            return selectedVendor ? (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVendorTypeColor(selectedVendor.type)}`}>
                {getVendorTypeLabel(selectedVendor.type)}
              </span>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default VendorSelector;