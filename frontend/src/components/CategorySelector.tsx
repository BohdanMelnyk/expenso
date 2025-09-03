import React, { useState, useEffect, useRef } from 'react';
import { categoryAPI, Category } from '../api/client';

interface CategorySelectorProps {
  selectedCategoryName: string;
  onCategorySelect: (categoryName: string) => void;
  className?: string;
  required?: boolean;
  error?: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryName,
  onCategorySelect,
  className = '',
  required = false,
  error = false
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // Update search term when selected category changes
    const selectedCategory = categories.find(c => c.name === selectedCategoryName);
    if (selectedCategory && !isOpen) {
      setSearchTerm(selectedCategory.name);
    } else if (!selectedCategoryName && !isOpen) {
      setSearchTerm('');
    }
  }, [selectedCategoryName, categories, isOpen]);

  useEffect(() => {
    // Filter categories based on search term
    if (searchTerm.trim() === '') {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCategories(filtered);
    }
    setSelectedIndex(-1);
  }, [searchTerm, categories]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search term to selected category name if no selection made
        const selectedCategory = categories.find(c => c.name === selectedCategoryName);
        if (selectedCategory) {
          setSearchTerm(selectedCategory.name);
        } else if (!selectedCategoryName) {
          setSearchTerm('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [categories, selectedCategoryName]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryAPI.getCategories();
      const sortedCategories = response.data.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(sortedCategories);
      setFilteredCategories(sortedCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
    
    // Clear selection if input is cleared
    if (value === '' && selectedCategoryName !== '') {
      onCategorySelect('');
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // Select all text when focusing
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  const handleCategorySelect = (category: Category) => {
    onCategorySelect(category.name);
    setSearchTerm(category.name);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCategories.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCategories.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredCategories.length) {
          handleCategorySelect(filteredCategories[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        // Reset to selected category
        const selectedCategory = categories.find(c => c.name === selectedCategoryName);
        setSearchTerm(selectedCategory ? selectedCategory.name : '');
        break;
    }
  };

  const getCategoryColor = (color: string) => {
    // Convert hex color to a light background with dark text
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    // Create a light version of the color for background
    const lightR = Math.min(255, r + 80);
    const lightG = Math.min(255, g + 80);
    const lightB = Math.min(255, b + 80);
    
    return {
      backgroundColor: `rgb(${lightR}, ${lightG}, ${lightB})`,
      color: color,
      borderColor: color
    };
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
        placeholder="Type to search categories..."
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
            <div className="px-3 py-2 text-gray-500">Loading categories...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="px-3 py-2 text-gray-500">
              {searchTerm.trim() === '' ? 'Start typing to search categories' : 'No categories found'}
            </div>
          ) : (
            filteredCategories.map((category, index) => (
              <div
                key={category.id}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                } ${selectedCategoryName === category.name ? 'bg-blue-100' : ''}`}
                onClick={() => handleCategorySelect(category)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-center">
                  <span className="text-lg mr-2">{category.icon}</span>
                  <span className="font-medium text-gray-900">{category.name}</span>
                </div>
                <span 
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                  style={getCategoryColor(category.color)}
                >
                  {category.name}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Show selected category info when closed */}
      {!isOpen && selectedCategoryName && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none flex items-center">
          {(() => {
            const selectedCategory = categories.find(c => c.name === selectedCategoryName);
            return selectedCategory ? (
              <>
                <span className="text-lg mr-1">{selectedCategory.icon}</span>
                <span 
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                  style={getCategoryColor(selectedCategory.color)}
                >
                  {selectedCategory.name}
                </span>
              </>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default CategorySelector;