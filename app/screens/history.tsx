import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, FAB, IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORY_ICONS, COLORS, SPACING } from '../constants/theme';

// Mock data - trong thực tế sẽ lấy từ AsyncStorage
const mockHistoryItems = [
  {
    id: '1',
    name: 'Nhà hàng ABC',
    address: '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
    category: 'restaurant',
    timestamp: '22/06/2024 14:30',
  },
  {
    id: '2',
    name: 'Quán Café XYZ',
    address: '456 Đường Lê Lợi, Quận 1, TP.HCM',
    category: 'cafe',
    timestamp: '22/06/2024 10:15',
  },
  {
    id: '3',
    name: 'Ngân hàng VPBank',
    address: '789 Đường Đồng Khởi, Quận 1, TP.HCM',
    category: 'bank',
    timestamp: '21/06/2024 17:45',
  },
  {
    id: '4',
    name: 'ATM Vietcombank',
    address: '101 Đường Lý Tự Trọng, Quận 1, TP.HCM',
    category: 'atm',
    timestamp: '20/06/2024 09:20',
  },
  {
    id: '5',
    name: 'Bệnh viện Chợ Rẫy',
    address: '201 Đường Nguyễn Chí Thanh, Quận 5, TP.HCM',
    category: 'hospital',
    timestamp: '19/06/2024 15:10',
  },
];

export default function HistoryScreen() {
  const router = useRouter();
  const [historyItems, setHistoryItems] = useState(mockHistoryItems);

  const navigateToPlace = (item) => {
    // Trong thực tế, điều hướng đến bản đồ với marker ở vị trí này
    console.log('Navigating to:', item);
    // router.push({ pathname: '/screens/map', params: { placeId: place.id } });
  };

  const clearHistory = () => {
    // Trong thực tế, xóa dữ liệu từ AsyncStorage
    setHistoryItems([]);
  };

  const removeHistoryItem = (id) => {
    // Trong thực tế, cập nhật AsyncStorage
    setHistoryItems(historyItems.filter(item => item.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          mode="contained"
          containerColor={COLORS.card}
          iconColor={COLORS.primary}
          size={24}
          onPress={() => router.back()}
        />
        <Text variant="titleLarge" style={styles.headerTitle}>Lịch Sử Tìm Kiếm</Text>
        <IconButton
          icon="delete-outline"
          mode="contained"
          containerColor={COLORS.card}
          iconColor={COLORS.primary}
          size={24}
          onPress={clearHistory}
          disabled={historyItems.length === 0}
        />
      </View>
      
      {/* History List */}
      <View style={styles.content}>
        {historyItems.length > 0 ? (
          <FlatList
            data={historyItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <Divider style={styles.divider} />}
            renderItem={({ item }) => (
              <Card style={styles.historyCard} mode="outlined">
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <IconButton
                      icon={CATEGORY_ICONS[item.category] || 'map-marker'}
                      size={24}
                      iconColor={COLORS.primary}
                      style={styles.categoryIcon}
                    />
                    <View style={styles.cardInfo}>
                      <Text variant="titleMedium" style={styles.placeName}>{item.name}</Text>
                      <Text variant="bodyMedium" style={styles.placeAddress}>{item.address}</Text>
                    </View>
                    <IconButton
                      icon="close"
                      size={16}
                      iconColor={COLORS.text}
                      onPress={() => removeHistoryItem(item.id)}
                    />
                  </View>
                  <Text variant="bodySmall" style={styles.timestamp}>{item.timestamp}</Text>
                </Card.Content>
                <Card.Actions style={styles.cardActions}>
                  <Button
                    mode="contained-tonal"
                    icon="directions"
                    onPress={() => navigateToPlace(item)}
                    style={styles.directionButton}
                  >
                    Chỉ đường
                  </Button>
                </Card.Actions>
              </Card>
            )}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <IconButton
              icon="history"
              size={64}
              iconColor={COLORS.border}
            />
            <Text variant="headlineSmall" style={styles.emptyTitle}>Chưa có lịch sử</Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Các địa điểm bạn tìm kiếm sẽ xuất hiện ở đây
            </Text>
            <Button
              mode="contained"
              icon="magnify"
              onPress={() => router.replace('/screens/search')}
              style={styles.searchButton}
              contentStyle={styles.buttonContent}
            >
              Tìm kiếm địa điểm
            </Button>
          </View>
        )}
      </View>
      
      {/* FAB để quay về màn hình bản đồ */}
      <FAB
        icon="map-outline"
        label="Xem bản đồ"
        style={styles.fab}
        onPress={() => router.push('/screens/map')}
        color="white"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
    backgroundColor: COLORS.card,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.medium,
  },
  historyCard: {
    marginBottom: SPACING.medium,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: SPACING.small,
  },
  placeName: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeAddress: {
    color: COLORS.text,
    opacity: 0.7,
  },
  timestamp: {
    marginTop: SPACING.small,
    color: COLORS.text,
    opacity: 0.5,
  },
  categoryIcon: {
    margin: 0,
  },
  cardActions: {
    justifyContent: 'flex-end',
  },
  directionButton: {
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.small,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.large,
  },
  emptyTitle: {
    marginTop: SPACING.medium,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: SPACING.small,
    marginBottom: SPACING.large,
    color: COLORS.text,
    opacity: 0.7,
  },
  searchButton: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small,
  },
  fab: {
    position: 'absolute',
    right: SPACING.large,
    bottom: SPACING.large,
    backgroundColor: COLORS.primary,
  },
}); 