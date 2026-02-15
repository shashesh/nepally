import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PostStackParamList } from '../types/navigation';
import CategorySelectScreen from '../screens/post/CategorySelectScreen';
import CreatePostScreen from '../screens/post/CreatePostScreen';
import { colors } from '../styles/colors';

const Stack = createNativeStackNavigator<PostStackParamList>();

export function PostNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.text.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="CategorySelect"
        component={CategorySelectScreen}
        options={{ title: 'Create Post' }}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: 'New Post' }}
      />
    </Stack.Navigator>
  );
}
