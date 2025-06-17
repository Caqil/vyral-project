import { createContext, useContext } from 'react';
import { PluginContext } from '../types';

const PluginContextReact = createContext<PluginContext | null>(null);

export function usePluginContext(): PluginContext {
  const context = useContext(PluginContextReact);
  if (!context) {
    throw new Error('usePluginContext must be used within a PluginProvider');
  }
  return context;
}

export { PluginContextReact as PluginContext };
