import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Card, Paragraph, Chip, ActivityIndicator } from 'react-native-paper';
import { categoryAPI, Category } from '../../shared/api/client';

interface CategorySelectorProps {
  selectedCategoryName: string;
  onCategorySelect: (categoryName: string) => void;
  style?: any;
  error?: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategoryName,
  onCategorySelect,
  style,
  error = false
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
  }, [searchTerm, categories]);

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

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setIsOpen(true);
    
    // Clear selection if input is cleared
    if (value === '' && selectedCategoryName !== '') {
      onCategorySelect('');
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay hiding to allow for item selection
    setTimeout(() => {
      setIsOpen(false);
      // Reset search term to selected category name if no selection made
      const selectedCategory = categories.find(c => c.name === selectedCategoryName);
      if (selectedCategory) {
        setSearchTerm(selectedCategory.name);
      } else if (!selectedCategoryName) {
        setSearchTerm('');
      }
    }, 150);
  };

  const handleCategorySelect = (category: Category) => {
    onCategorySelect(category.name);
    setSearchTerm(category.name);
    setIsOpen(false);
  };

  const getCategoryColor = (color: string) => {
    // Convert hex color to a light background
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    // Create a light version of the color for background
    const lightR = Math.min(255, r + 80);
    const lightG = Math.min(255, g + 80);
    const lightB = Math.min(255, b + 80);
    
    return `rgb(${lightR}, ${lightG}, ${lightB})`;
  };

  const renderCategoryItem = ({ item, index }: { item: Category; index: number }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategoryName === item.name && styles.selectedCategoryItem
      ]}
      onPress={() => handleCategorySelect(item)}
    >
      <View style={styles.categoryInfo}>
        <View style={styles.categoryLeft}>
          <Paragraph style={styles.categoryIcon}>{item.icon}</Paragraph>
          <Paragraph style={styles.categoryName}>{item.name}</Paragraph>
        </View>
        <Chip
          mode="flat"
          compact
          style={[styles.categoryChip, { backgroundColor: getCategoryColor(item.color) }]}
          textStyle={[styles.categoryChipText, { color: item.color }]}
        >
          {item.name}
        </Chip>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <TextInput
        value={searchTerm}
        onChangeText={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder="Type to search categories..."
        mode="outlined"
        error={error}
        autoComplete="off"
        style={styles.textInput}
      />

      {isOpen && (
        <Card style={styles.dropdown}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
              <Paragraph style={styles.loadingText}>Loading categories...</Paragraph>
            </View>
          ) : filteredCategories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Paragraph style={styles.emptyText}>
                {searchTerm.trim() === '' ? 'Start typing to search categories' : 'No categories found'}
              </Paragraph>
            </View>
          ) : (
            <FlatList
              data={filteredCategories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.categoryList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            />
          )}
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  textInput: {
    marginBottom: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 65,
    left: 0,
    right: 0,
    maxHeight: 250,
    elevation: 4,
    zIndex: 1000,
  },
  loadingContainer: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
  },
  emptyContainer: {
    padding: 16,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 200,
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectedCategoryItem: {
    backgroundColor: '#E3F2FD',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  categoryName: {
    flex: 1,
    fontWeight: '500',
    color: '#333',
  },
  categoryChip: {
    marginLeft: 8,
  },
  categoryChipText: {
    fontSize: 10,
  },
});

export default CategorySelector;