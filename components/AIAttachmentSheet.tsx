import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  onSelectImage: (uri: string, base64?: string, mimeType?: string) => void;
}

export const AIAttachmentSheet = forwardRef<BottomSheetModal, Props>(({ onSelectImage }, ref) => {
  const snapPoints = useMemo(() => ['25%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const handlePickImage = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      onSelectImage(asset.uri, asset.base64 || undefined, mimeType);
      (ref as any).current?.close();
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.indicator}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>Add to Chat</Text>

        <View style={styles.grid}>
          <TouchableOpacity style={styles.item} onPress={() => handlePickImage(true)}>
            <View style={styles.iconCircle}>
              <IconSymbol name="camera.fill" size={24} color={Colors.dark.text} />
            </View>
            <Text style={styles.itemLabel}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={() => handlePickImage(false)}>
            <View style={styles.iconCircle}>
              <IconSymbol name="photo.fill" size={24} color={Colors.dark.text} />
            </View>
            <Text style={styles.itemLabel}>Photos</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  background: {
    backgroundColor: '#1C1C1E',
  },
  indicator: {
    backgroundColor: '#3A3A3C',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  title: {
    ...Typography.h3,
    color: Colors.dark.text,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  item: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  itemLabel: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
});
