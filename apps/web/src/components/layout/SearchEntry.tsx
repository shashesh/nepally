import React from 'react';
import { ActionIcon } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { SearchCombobox } from '../search/SearchCombobox';
import { SearchOverlay } from '../search/SearchOverlay';
import { PHONE_MEDIA_QUERY } from './breakpoints';

/** Top-bar search: inline combobox on wide screens, icon + overlay on phones. */
export function SearchEntry() {
  const isPhone = useMediaQuery(PHONE_MEDIA_QUERY);
  const [opened, { open, close }] = useDisclosure(false);

  if (!isPhone) return <SearchCombobox />;

  return (
    <>
      <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Search" onClick={open}>
        <IconSearch size={22} aria-hidden="true" />
      </ActionIcon>
      <SearchOverlay opened={opened} onClose={close} />
    </>
  );
}
