declare module 'react-native-vector-icons/Ionicons' {
  import { Component } from 'react';
  import { ColorValue, TextStyle, ViewStyle } from 'react-native';

  interface IoniconsProps {
    name: string;
    size?: number;
    color?: ColorValue;
    style?: TextStyle | ViewStyle;
    [key: string]: any;
  }

  export default class Ionicons extends Component<IoniconsProps> {}
}
