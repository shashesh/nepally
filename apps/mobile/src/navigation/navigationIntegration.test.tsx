import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

/**
 * Integration smoke tests for the React Navigation stack itself.
 *
 * Every other navigation-touching test in this app mocks
 * `@react-navigation/native`, which means none of them would notice if the
 * navigators stopped constructing — exactly the class of breakage a major
 * React Navigation upgrade causes. These tests deliberately use the real
 * library, the real native-stack (which talks to react-native-screens) and
 * the real bottom-tabs, in the same shapes RootNavigator and
 * MainTabNavigator use.
 */

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function wrap(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>{ui}</NavigationContainer>
    </SafeAreaProvider>
  );
}

type TestStackParamList = {
  First: undefined;
  Second: { value: string };
};

function FirstScreen() {
  const navigation = useNavigation<{ navigate: (n: 'Second', p: { value: string }) => void }>();
  return (
    <View>
      <Text>first screen</Text>
      <TouchableOpacity onPress={() => navigation.navigate('Second', { value: 'passed-through' })}>
        <Text>go to second</Text>
      </TouchableOpacity>
    </View>
  );
}

function SecondScreen({ route }: { route: { params: { value: string } } }) {
  return <Text>second screen: {route.params.value}</Text>;
}

describe('React Navigation integration', () => {
  describe('native stack', () => {
    const Stack = createNativeStackNavigator<TestStackParamList>();

    const StackTree = () => (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="First" component={FirstScreen} />
        <Stack.Screen name="Second" component={SecondScreen} />
      </Stack.Navigator>
    );

    it('mounts and renders the initial route', () => {
      wrap(<StackTree />);
      expect(screen.getByText('first screen')).toBeTruthy();
    });

    it('navigates between screens and passes route params', async () => {
      wrap(<StackTree />);

      fireEvent.press(screen.getByText('go to second'));

      await waitFor(() => {
        expect(screen.getByText('second screen: passed-through')).toBeTruthy();
      });
    });
  });

  describe('bottom tabs', () => {
    const Tab = createBottomTabNavigator();

    // Declared at module scope, not inline in `component`: an inline arrow
    // remounts the screen on every render, and React Navigation warns about it.
    const HomeTabBody = () => <Text>home tab body</Text>;
    const EventsTabBody = () => <Text>events tab body</Text>;

    const TabTree = () => (
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen
          name="Home"
          component={HomeTabBody}
          options={{ tabBarLabel: 'Home', tabBarAccessibilityLabel: 'Home tab' }}
        />
        <Tab.Screen
          name="Events"
          component={EventsTabBody}
          options={{ tabBarLabel: 'Events', tabBarAccessibilityLabel: 'Events tab' }}
        />
      </Tab.Navigator>
    );

    it('mounts and renders the first tab', () => {
      wrap(<TabTree />);
      expect(screen.getByText('home tab body')).toBeTruthy();
    });

    it('switches tabs when the tab bar button is pressed', async () => {
      wrap(<TabTree />);

      fireEvent.press(screen.getByLabelText('Events tab'));

      await waitFor(() => {
        expect(screen.getByText('events tab body')).toBeTruthy();
      });
    });
  });

  describe('tabs nesting a stack', () => {
    // The shape RootNavigator actually uses: a stack at the root, whose screen
    // is a tab navigator, whose tabs are themselves stacks.
    const RootStack = createNativeStackNavigator();
    const Tab = createBottomTabNavigator();
    const InnerStack = createNativeStackNavigator<TestStackParamList>();

    const InnerStackTree = () => (
      <InnerStack.Navigator screenOptions={{ headerShown: false }}>
        <InnerStack.Screen name="First" component={FirstScreen} />
        <InnerStack.Screen name="Second" component={SecondScreen} />
      </InnerStack.Navigator>
    );

    const TabsTree = () => (
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen
          name="Home"
          component={InnerStackTree}
          options={{ tabBarAccessibilityLabel: 'Home tab' }}
        />
      </Tab.Navigator>
    );

    it('renders a stack nested inside a tab inside a stack, and navigates within it', async () => {
      wrap(
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Main" component={TabsTree} />
        </RootStack.Navigator>
      );

      expect(screen.getByText('first screen')).toBeTruthy();

      fireEvent.press(screen.getByText('go to second'));

      await waitFor(() => {
        expect(screen.getByText('second screen: passed-through')).toBeTruthy();
      });
    });
  });

  describe('reaching another tab or the Chat stack', () => {
    // RootNavigator's shape: Main (tabs, each a stack) and Chat side by side on
    // the root stack. A screen in one tab's stack, like EventDetail, calls
    // getParent() to get the tab navigator. An action it can't handle goes up
    // to the root, never down into another tab's stack or into Chat.
    const RootStack = createNativeStackNavigator();
    const Tab = createBottomTabNavigator();
    const HomeStack = createNativeStackNavigator();
    const EventsStack = createNativeStackNavigator();
    const ChatStack = createNativeStackNavigator();

    let target: [string, object?] = ['Home'];
    const EventScreen = () => {
      const navigation = useNavigation();
      return (
        <TouchableOpacity onPress={() => navigation.getParent()?.navigate(...(target as [string]))}>
          <Text>event</Text>
        </TouchableOpacity>
      );
    };
    const HomeMain = () => <Text>home</Text>;
    const Profile = () => <Text>profile</Text>;
    const Threads = () => <Text>threads</Text>;
    const Thread = () => <Text>thread</Text>;
    const HomeTree = () => (
      <HomeStack.Navigator screenOptions={{ headerShown: false }}>
        <HomeStack.Screen name="HomeMain" component={HomeMain} />
        <HomeStack.Screen name="PublicProfileView" component={Profile} />
      </HomeStack.Navigator>
    );
    const EventsTree = () => (
      <EventsStack.Navigator screenOptions={{ headerShown: false }}>
        <EventsStack.Screen name="EventDetail" component={EventScreen} />
      </EventsStack.Navigator>
    );
    const TabsTree = () => (
      <Tab.Navigator initialRouteName="Events" screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Home" component={HomeTree} />
        <Tab.Screen name="Events" component={EventsTree} />
      </Tab.Navigator>
    );
    const ChatTree = () => (
      <ChatStack.Navigator screenOptions={{ headerShown: false }}>
        <ChatStack.Screen name="ConversationList" component={Threads} />
        <ChatStack.Screen name="MessageThread" component={Thread} />
      </ChatStack.Navigator>
    );
    const AppTree = () => (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Main" component={TabsTree} />
        <RootStack.Screen name="Chat" component={ChatTree} />
      </RootStack.Navigator>
    );

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('does not reach a screen by its bare name from inside a tab', () => {
      const unhandled = jest.spyOn(console, 'error').mockImplementation(() => {});
      wrap(<AppTree />);

      for (const name of ['PublicProfileView', 'MessageThread']) {
        target = [name, {}];
        fireEvent.press(screen.getByText('event'));
      }

      expect(screen.queryByText('profile')).toBeNull();
      expect(screen.queryByText('thread')).toBeNull();
      expect(unhandled).toHaveBeenCalledWith(expect.stringContaining('was not handled by any navigator'));
    });

    it("opens another tab's screen by naming the tab", async () => {
      wrap(<AppTree />);
      target = ['Home', { screen: 'PublicProfileView', params: { userId: 'u1' } }];

      fireEvent.press(screen.getByText('event'));

      await waitFor(() => {
        expect(screen.getByText('profile')).toBeTruthy();
      });
    });

    it('opens a chat thread by naming the Chat stack', async () => {
      wrap(<AppTree />);
      target = ['Chat', { screen: 'MessageThread', params: { conversationId: 'c1' } }];

      fireEvent.press(screen.getByText('event'));

      await waitFor(() => {
        expect(screen.getByText('thread')).toBeTruthy();
      });
    });
  });
});
