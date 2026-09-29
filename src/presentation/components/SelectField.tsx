import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { FieldPrefixIcon, FieldShell } from './FieldShell';
import type { IoniconName } from './icon-name';
import { haptics } from '../haptics';
import { borderWidth, colors, radius, shadow, spacing } from '../theme';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectFieldProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly SelectOption[];
  readonly onChange: (value: string) => void;
  readonly error?: string | null;
  readonly hint?: string;
  readonly placeholder?: string;
  readonly prefixIcon?: IoniconName;
  readonly sheetTitle?: string;
  readonly disabled?: boolean;
  readonly testID?: string;
}

/** Fixed row height keeps `getItemLayout` exact for the initial scroll index. */
const ROW_HEIGHT = 52;

/**
 * Dropdown field: a form-style trigger that opens a scrollable option sheet.
 *
 * Chosen over a wheel/picker because scanning a list of times is faster than
 * spinning a dial, and it gives us one consistent control on both platforms.
 * The sheet opens already scrolled to the current value.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  error,
  hint,
  placeholder = 'Select an option',
  prefixIcon,
  sheetTitle,
  disabled = false,
  testID,
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const listHeight = Math.min(360, Math.round(windowHeight * 0.45));

  const close = (): void => {
    setIsOpen(false);
  };

  return (
    <>
      <FieldShell
        label={label}
        onPress={() => {
          haptics.selection();
          setIsOpen(true);
        }}
        disabled={disabled}
        open={isOpen}
        error={error}
        hint={hint}
        accessibilityLabel={`${label}: ${selected?.label ?? 'nothing selected'}`}
        accessibilityHint={`Opens a list of ${label.toLowerCase()} options`}
        testID={testID}
      >
        {prefixIcon ? <FieldPrefixIcon name={prefixIcon} /> : null}
        <AppText
          variant="body"
          color={selected ? colors.textPrimary : colors.textMuted}
          style={styles.value}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </AppText>
      </FieldShell>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={close}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={`Close the ${label.toLowerCase()} list`}
          />

          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.sheetHeader}>
              <AppText variant="subheading">{sheetTitle ?? label}</AppText>
              <Pressable
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel={`Close the ${label.toLowerCase()} list`}
                hitSlop={10}
                style={({ pressed }) => [styles.closeButton, pressed ? styles.closeButtonPressed : null]}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={{ height: listHeight }}>
              <FlatList
                data={options}
                keyExtractor={(option) => option.value}
                initialScrollIndex={Math.max(0, selectedIndex)}
                getItemLayout={(_data, index) => ({
                  length: ROW_HEIGHT,
                  offset: ROW_HEIGHT * index,
                  index,
                })}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = item.value === value;

                  return (
                    <Pressable
                      onPress={() => {
                        haptics.selection();
                        onChange(item.value);
                        close();
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
                    >
                      <AppText
                        variant="body"
                        color={isSelected ? colors.textPrimary : colors.textSecondary}
                        style={styles.rowLabel}
                      >
                        {item.label}
                      </AppText>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  value: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingTop: spacing.lg,
    ...shadow.raised,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.borderSubtle,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    backgroundColor: colors.badgeFill,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  rowPressed: {
    backgroundColor: colors.cardMuted,
  },
  rowLabel: {
    flex: 1,
  },
});
