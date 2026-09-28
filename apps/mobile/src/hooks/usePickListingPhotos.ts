import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { logClientEvent } from '@nepally/shared';
import type { PickedListingPhoto } from '../components/marketplace/listingPhotos';

/** Listing photos are resized to this width and saved as JPEG before upload. */
const PHOTO_WIDTH = 1200;
const PHOTO_QUALITY = 0.8;

async function processPhoto(uri: string): Promise<PickedListingPhoto> {
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: PHOTO_WIDTH } }],
    {
      compress: PHOTO_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  const fileData = await new File(resized.uri).arrayBuffer();
  return {
    kind: 'picked',
    key: resized.uri,
    uri: resized.uri,
    fileData,
    mimeType: 'image/jpeg',
    sizeBytes: fileData.byteLength,
  };
}

export interface ListingPhotoPicker {
  /** True while picked photos are being resized, before they reach the form. */
  processing: boolean;
  fromLibrary: () => Promise<void>;
  fromCamera: () => Promise<void>;
}

/**
 * Picks listing photos from the library or the camera and hands them over
 * resized, in the order picked. `room` is how many more the listing can take.
 *
 * The library needs no permission: the system picker only shares what the
 * member picks, so a member who once refused photo access can still add
 * photos. The camera does need one, and a refusal says how to allow it.
 */
export function usePickListingPhotos(
  room: number,
  onPicked: (photos: PickedListingPhoto[]) => void
): ListingPhotoPicker {
  const [processing, setProcessing] = useState(false);

  const addAssets = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[]) => {
      setProcessing(true);
      const results = await Promise.allSettled(assets.map((asset) => processPhoto(asset.uri)));
      setProcessing(false);

      const picked = results
        .filter(
          (result): result is PromiseFulfilledResult<PickedListingPhoto> =>
            result.status === 'fulfilled'
        )
        .map((result) => result.value);
      if (picked.length > 0) onPicked(picked);

      const failed = results.length - picked.length;
      if (failed > 0) {
        Alert.alert(
          failed === 1 ? "1 photo couldn't be added" : `${failed} photos couldn't be added`,
          'Try again, or pick a different photo.'
        );
      }
    },
    [onPicked]
  );

  const fromLibrary = useCallback(async () => {
    if (room <= 0) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: room,
        quality: 1,
      });
      if (result.canceled || result.assets.length === 0) return;
      await addAssets(result.assets.slice(0, room));
    } catch (error) {
      logClientEvent({
        event: 'listing_photo_pick_failed',
        error,
        context: { platform: 'mobile', source: 'library' },
      });
      Alert.alert("Couldn't open your photos", 'Please try again.');
    }
  }, [room, addAssets]);

  const fromCamera = useCallback(async () => {
    if (room <= 0) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera access needed',
          'To take photos for your listing, allow Nepally to use the camera in Settings.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ]
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled || result.assets.length === 0) return;
      await addAssets(result.assets.slice(0, 1));
    } catch (error) {
      logClientEvent({
        event: 'listing_photo_pick_failed',
        error,
        context: { platform: 'mobile', source: 'camera' },
      });
      Alert.alert("Couldn't open the camera", 'Please try again.');
    }
  }, [room, addAssets]);

  return { processing, fromLibrary, fromCamera };
}
