import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BORDER_RADIUS, COLORS, SHADOW, SPACING } from './constants/theme';

export default function Home() {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.logo}>Go There</Text>
      </View>
      
      <View style={styles.mapPreviewContainer}>
        <View style={styles.mapPreview}>
          <Text style={styles.mapText}>Bản đồ</Text>
        </View>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => router.push('/screens/map')}
        >
          <Ionicons name="map" size={20} color={COLORS.background} />
          <Text style={styles.mapButtonText}>Xem bản đồ</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchSection}>
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => router.push('/screens/search')}
        >
          <Ionicons name="search" size={20} color={COLORS.grayText} />
          <Text style={styles.searchText}>Tìm địa điểm...</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.categories}>
        <Text style={styles.sectionTitle}>Khám phá</Text>
        <View style={styles.categoriesGrid}>
          <TouchableOpacity 
            style={styles.categoryItem}
            onPress={() => router.push({
              pathname: '/screens/search',
              params: { category: 'restaurant' }
            })}
          >
            <View style={[styles.categoryIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="restaurant-outline" size={24} color={COLORS.secondary} />
            </View>
            <Text style={styles.categoryText}>Nhà hàng</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.categoryItem}
            onPress={() => router.push({
              pathname: '/screens/search',
              params: { category: 'cafe' }
            })}
          >
            <View style={[styles.categoryIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="cafe-outline" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.categoryText}>Quán cà phê</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.categoryItem}
            onPress={() => router.push({
              pathname: '/screens/search',
              params: { category: 'atm' }
            })}
          >
            <View style={[styles.categoryIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="card-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.categoryText}>ATM</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.categoryItem}
            onPress={() => router.push({
              pathname: '/screens/search',
              params: { category: 'hospital' }
            })}
          >
            <View style={[styles.categoryIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="medkit-outline" size={24} color={COLORS.notification} />
            </View>
            <Text style={styles.categoryText}>Y tế</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Tiện ích</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/screens/history')}
          >
            <View style={styles.actionContent}>
              <Ionicons name="time-outline" size={22} color={COLORS.primary} />
              <Text style={styles.actionText}>Lịch sử</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/screens/favorites')}
          >
            <View style={styles.actionContent}>
              <Ionicons name="heart-outline" size={22} color={COLORS.notification} />
              <Text style={styles.actionText}>Yêu thích</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING.large,
    paddingBottom: SPACING.medium,
    backgroundColor: COLORS.primary,
  },
  logo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  mapPreviewContainer: {
    height: 220,
    position: 'relative',
  },
  mapPreview: {
    backgroundColor: COLORS.lightBackground,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    color: COLORS.grayText,
    fontSize: 16,
  },
  mapButton: {
    position: 'absolute',
    bottom: -20,
    right: SPACING.large,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.medium,
    borderRadius: BORDER_RADIUS.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    ...SHADOW.medium,
  },
  mapButtonText: {
    color: COLORS.background,
    fontWeight: '500',
  },
  searchSection: {
    paddingHorizontal: SPACING.large,
    marginTop: SPACING.xl,
  },
  searchBar: {
    backgroundColor: COLORS.lightBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.medium,
    borderRadius: BORDER_RADIUS.medium,
    ...SHADOW.small,
  },
  searchText: {
    color: COLORS.grayText,
    marginLeft: SPACING.small,
    fontSize: 15,
  },
  categories: {
    paddingHorizontal: SPACING.large,
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.medium,
    color: COLORS.darkText,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryItem: {
    width: '48%',
    marginBottom: SPACING.medium,
    backgroundColor: COLORS.background,
    padding: SPACING.medium,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    ...SHADOW.small,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  categoryText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 4,
  },
  quickActions: {
    paddingHorizontal: SPACING.large,
    marginTop: SPACING.large,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.medium,
    width: '48%',
    ...SHADOW.small,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
});
