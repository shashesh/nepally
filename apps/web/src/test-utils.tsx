import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { cssVariablesResolver, nepallyTheme } from './styles/mantine-theme';

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={nepallyTheme} cssVariablesResolver={cssVariablesResolver} env="test">
      <ModalsProvider>{children}</ModalsProvider>
    </MantineProvider>
  );
}

function renderWithMantine(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: TestWrapper, ...options });
}

export { renderWithMantine as render };
export { screen, fireEvent, createEvent, waitFor, act, within } from '@testing-library/react';
