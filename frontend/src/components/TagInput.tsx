import React, { useState, useEffect } from 'react';
import { Tag, tagAPI } from '../api/client';
import { X } from 'lucide-react';

/**
 * TagInput Component - Enhanced Tag Management with Space-Based Auto-Addition
 *
 * FEATURE: Auto-addable tags with async creation
 * - Type a tag name and press SPACE or ENTER to instantly create or select it
 * - Automatically creates new tags with random colors
 * - Detects existing tags and prevents duplicates
 * - Supports both new tag creation and existing tag selection
 * - Shows available tag suggestions for quick selection
 * - Fully async operations with loading states
 *
 * Usage:
 * <TagInput
 *   selectedTags={selectedTags}
 *   onTagsChange={setSelectedTags}
 *   availableTags={tags}
 *   onTagsRefresh={fetchTags}
 * />
 */

interface TagInputProps {
  selectedTags: number[];
  onTagsChange: (tagIds: number[]) => void;
  availableTags: Tag[];
  onTagsRefresh: () => void;
}

export const TagInput: React.FC<TagInputProps> = ({
  selectedTags,
  onTagsChange,
  availableTags,
  onTagsRefresh,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map selected tag IDs to tag objects for display
  const selectedTagObjects = availableTags.filter(tag => selectedTags.includes(tag.id));

  /**
   * FEATURE: Space/Enter-based auto-addition
   * Detects SPACE or ENTER key press and triggers tag creation/selection
   * This makes tag creation a single-keystroke operation
   */
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && inputValue.trim()) {
      e.preventDefault();
      await handleAddTag();
    }
  };

  /**
   * FEATURE: Async tag creation and selection
   * - Detects if tag already exists (case-insensitive)
   * - If exists: adds it to selected tags
   * - If new: creates it asynchronously with random color
   * - Handles async API calls without blocking UI
   */
  const handleAddTag = async () => {
    const tagName = inputValue.trim();
    if (!tagName) return;

    setError(null);
    setIsCreating(true);

    try {
      // DUPLICATE PREVENTION: Check if tag already exists
      const existingTag = availableTags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());

      if (existingTag) {
        // Tag exists, add it if not already selected
        if (!selectedTags.includes(existingTag.id)) {
          onTagsChange([...selectedTags, existingTag.id]);
        }
      } else {
        // NEW TAG CREATION: Asynchronously create with random color
        const colors = [
          '#FF6B6B',
          '#4ECDC4',
          '#45B7D1',
          '#FFA07A',
          '#98D8C8',
          '#F7DC6F',
          '#BB8FCE',
          '#85C1E2',
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        // Async API call - creates tag without page reload
        const newTag = await tagAPI.createTag({
          name: tagName,
          color: randomColor,
        });

        // Refresh tags list to sync with backend
        onTagsRefresh();

        // Add the new tag to selected tags
        onTagsChange([...selectedTags, newTag.data.id]);
      }

      setInputValue('');
    } catch (err) {
      setError('Failed to create or select tag');
      console.error('Error creating tag:', err);
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * FEATURE: Tag removal
   * Click X button to remove a tag from selection
   */
  const handleRemoveTag = (tagId: number) => {
    onTagsChange(selectedTags.filter(id => id !== tagId));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>

      {/* Input Field */}
      <div className="mb-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a tag name and press space or enter"
          disabled={isCreating}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            isCreating ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />
      </div>

      {/* Error Message */}
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {/* Selected Tags Display */}
      <div className="flex flex-wrap gap-2 mb-3">
        {selectedTagObjects.map(tag => (
          <div
            key={tag.id}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name.replace('_', ' ')}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-1 hover:opacity-75 transition-opacity"
              title="Remove tag"
              disabled={isCreating}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Available Tags Suggestion */}
      {availableTags.length > 0 && selectedTags.length < availableTags.length && (
        <div>
          <p className="text-xs text-gray-600 mb-2">Or click to select from existing tags:</p>
          <div className="flex flex-wrap gap-2">
            {availableTags
              .filter(tag => !selectedTags.includes(tag.id))
              .slice(0, 10)
              .map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    onTagsChange([...selectedTags, tag.id]);
                  }}
                  disabled={isCreating}
                  className="px-3 py-1 rounded-full text-sm font-medium border transition-colors hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: tag.color,
                    color: tag.color,
                    backgroundColor: `${tag.color}10`,
                  }}
                >
                  + {tag.name.replace('_', ' ')}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Counter */}
      {selectedTags.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
};
