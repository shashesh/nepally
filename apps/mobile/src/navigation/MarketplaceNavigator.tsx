import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MarketplaceStackParamList } from '../types/navigation';
import { colors } from '../styles/colors';
import MarketplaceHomeScreen from '../screens/marketplace/MarketplaceHomeScreen';
import MarketplaceCategoryScreen from '../screens/marketplace/MarketplaceCategoryScreen';
import ListingDetailScreen from '../screens/marketplace/ListingDetailScreen';
import CreateListingScreen from '../screens/marketplace/CreateListingScreen';
import MyListingsScreen from '../screens/marketplace/MyListingsScreen';
import PromoteListingScreen from '../screens/marketplace/PromoteListingScreen';
import BrowseCategoriesScreen from '../screens/marketplace/BrowseCategoriesScreen';
import MarketplaceRulesScreen from '../screens/marketplace/MarketplaceRulesScreen';
import SavedListingsScreen from '../screens/marketplace/SavedListingsScreen';

const Stack = createNativeStackNavigator<MarketplaceStackParamList>();

export function MarketplaceNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.primary.main,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="MarketplaceHome"
        component={MarketplaceHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MarketplaceCategory"
        component={MarketplaceCategoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="MyListings"
        component={MyListingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PromoteListing"
        component={PromoteListingScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="BrowseCategories"
        component={BrowseCategoriesScreen}
        options={{ title: 'Browse Categories' }}
      />
      <Stack.Screen
        name="MarketplaceRules"
        component={MarketplaceRulesScreen}
        options={{ title: 'Marketplace Rules' }}
      />
      <Stack.Screen
        name="SavedListings"
        component={SavedListingsScreen}
        options={{ title: 'Saved' }}
      />
    </Stack.Navigator>
  );
}
