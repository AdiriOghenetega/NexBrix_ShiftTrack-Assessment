import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

/** Union of every valid Ionicon name, used to type icon props. */
export type IoniconName = ComponentProps<typeof Ionicons>['name'];
