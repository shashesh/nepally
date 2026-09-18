import React from 'react';
import { Modal } from '@mantine/core';
import { SearchCombobox } from './SearchCombobox';

export interface SearchOverlayProps {
  opened: boolean;
  onClose: () => void;
}

/** Full-screen search for phones; results list inline under the input. */
export function SearchOverlay({ opened, onClose }: SearchOverlayProps) {
  return (
    <Modal opened={opened} onClose={onClose} fullScreen title="Search" radius={0} transitionProps={{ transition: 'fade', duration: 120 }}>
      <SearchCombobox layout="inline" autoFocus onNavigate={onClose} />
    </Modal>
  );
}
