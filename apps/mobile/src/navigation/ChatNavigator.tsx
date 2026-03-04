import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../types/navigation';
import ConversationListScreen from '../screens/chat/ConversationListScreen';
import MessageThreadScreen from '../screens/chat/MessageThreadScreen';
import { colors } from '../styles/colors';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export function ChatNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="ConversationList"
        component={ConversationListScreen}
        options={{
          headerShown: true,
          title: 'Messages',
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.primary.main,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen name="MessageThread" component={MessageThreadScreen} />
    </Stack.Navigator>
  );
}
