import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Card, Paragraph, Chip, ActivityIndicator } from 'react-native-paper';
import { vendorAPI, Vendor } from '../../shared/api/client';

interface VendorSelectorProps {
  selectedVendorId: number;
  onVendorSelect: (vendorId: number) => void;
  style?: any;
  error?: boolean;
}

const VendorSelector: React.FC<VendorSelectorProps> = ({
  selectedVendorId,
  onVendorSelect,
  style,
  error = false
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
  }, [searchTerm, vendors]);

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

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setIsOpen(true);
    
    // Clear selection if input is cleared
    if (value === '' && selectedVendorId !== 0) {
      onVendorSelect(0);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay hiding to allow for item selection
    setTimeout(() => {
      setIsOpen(false);
      // Reset search term to selected vendor name if no selection made
      const selectedVendor = vendors.find(v => v.id === selectedVendorId);
      if (selectedVendor) {
        setSearchTerm(selectedVendor.name);
      } else if (selectedVendorId === 0) {
        setSearchTerm('');
      }
    }, 150);
  };

  const handleVendorSelect = (vendor: Vendor) => {
    onVendorSelect(vendor.id);
    setSearchTerm(vendor.name);
    setIsOpen(false);
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
      care: '#FCE4EC',
      car: '#E3F2FD',
      clothing: '#F3E5F5',
      eating_out: '#FFF3E0',
      else: '#F5F5F5',
      food_store: '#E8F5E8',
      household: '#FFFDE7',
      living: '#E8EAF6',
      salary: '#E0F2F1',
      subscriptions: '#FFEBEE',
      transport: '#E0F7FA',
      tourism: '#E0F2F1',
    };
    return typeColors[type] || '#F5F5F5';
  };

  const renderVendorItem = ({ item, index }: { item: Vendor; index: number }) => (
    <TouchableOpacity
      style={[
        styles.vendorItem,
        selectedVendorId === item.id && styles.selectedVendorItem
      ]}
      onPress={() => handleVendorSelect(item)}
    >
      <View style={styles.vendorInfo}>
        <Paragraph style={styles.vendorName}>{item.name}</Paragraph>
        <Chip
          mode="flat"
          compact
          style={[styles.typeChip, { backgroundColor: getVendorTypeColor(item.type) }]}
          textStyle={styles.typeChipText}
        >
          {getVendorTypeLabel(item.type)}
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
        placeholder="Type to search vendors..."
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
              <Paragraph style={styles.loadingText}>Loading vendors...</Paragraph>
            </View>
          ) : filteredVendors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Paragraph style={styles.emptyText}>
                {searchTerm.trim() === '' ? 'Start typing to search vendors' : 'No vendors found'}
              </Paragraph>
            </View>
          ) : (
            <FlatList
              data={filteredVendors}
              renderItem={renderVendorItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.vendorList}
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
  vendorList: {
    maxHeight: 200,
  },
  vendorItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectedVendorItem: {
    backgroundColor: '#E3F2FD',
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vendorName: {
    flex: 1,
    fontWeight: '500',
    color: '#333',
  },
  typeChip: {
    marginLeft: 8,
  },
  typeChipText: {
    fontSize: 10,
    color: '#666',
  },
});

export default VendorSelector;