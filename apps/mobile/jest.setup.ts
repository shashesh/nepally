// Expo icons load fonts asynchronously, which can trigger act warnings and slow CI tests.
jest.mock('@expo/vector-icons', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  const MockIcon = ({ name }: { name?: string }) => {
    return React.createElement(Text, null, name ?? 'icon');
  };

  return {
    Ionicons: MockIcon,
    MaterialIcons: MockIcon,
    MaterialCommunityIcons: MockIcon,
    FontAwesome: MockIcon,
    Feather: MockIcon,
    Entypo: MockIcon,
    AntDesign: MockIcon,
  };
});
