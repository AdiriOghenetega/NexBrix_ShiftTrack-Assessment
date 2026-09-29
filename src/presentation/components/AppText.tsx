import { Text, type TextProps } from 'react-native';

import { textStyles, type TextVariant } from '../theme';

export interface AppTextProps extends TextProps {
  readonly variant?: TextVariant;
  readonly color?: string;
  readonly align?: 'auto' | 'left' | 'center' | 'right';
}

/** Typography primitive — every piece of text in the app goes through this. */
export function AppText({ variant = 'body', color, align, style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[textStyles[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
    />
  );
}
