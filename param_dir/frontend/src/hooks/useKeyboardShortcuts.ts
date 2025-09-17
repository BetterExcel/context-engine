import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  preventDefault?: boolean;
}

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
  preventDefault = true
}: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey;
      const altMatches = !!shortcut.altKey === event.altKey;
      const metaMatches = !!shortcut.metaKey === event.metaKey;

      return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
    });

    if (matchingShortcut) {
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
      matchingShortcut.action();
    }
  }, [shortcuts, enabled, preventDefault]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return {
    shortcuts: shortcuts.map(shortcut => ({
      ...shortcut,
      displayKey: formatShortcutDisplay(shortcut)
    }))
  };
};

export const formatShortcutDisplay = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.metaKey) parts.push('Cmd');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
};

// Common keyboard shortcuts for spreadsheet applications
export const createSpreadsheetShortcuts = (actions: {
  onCopy?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAll?: () => void;
  onFind?: () => void;
  onSave?: () => void;
  onNewFile?: () => void;
  onHelp?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleHistory?: () => void;
  onToggleFeedback?: () => void;
}): KeyboardShortcut[] => {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.onCopy) {
    shortcuts.push({
      key: 'c',
      ctrlKey: true,
      action: actions.onCopy,
      description: 'Copy selected cells',
      category: 'Edit'
    });
  }

  if (actions.onPaste) {
    shortcuts.push({
      key: 'v',
      ctrlKey: true,
      action: actions.onPaste,
      description: 'Paste clipboard content',
      category: 'Edit'
    });
  }

  if (actions.onUndo) {
    shortcuts.push({
      key: 'z',
      ctrlKey: true,
      action: actions.onUndo,
      description: 'Undo last action',
      category: 'Edit'
    });
  }

  if (actions.onRedo) {
    shortcuts.push({
      key: 'y',
      ctrlKey: true,
      action: actions.onRedo,
      description: 'Redo last undone action',
      category: 'Edit'
    });
  }

  if (actions.onSelectAll) {
    shortcuts.push({
      key: 'a',
      ctrlKey: true,
      action: actions.onSelectAll,
      description: 'Select all cells',
      category: 'Selection'
    });
  }

  if (actions.onFind) {
    shortcuts.push({
      key: 'f',
      ctrlKey: true,
      action: actions.onFind,
      description: 'Find in spreadsheet',
      category: 'Navigation'
    });
  }

  if (actions.onSave) {
    shortcuts.push({
      key: 's',
      ctrlKey: true,
      action: actions.onSave,
      description: 'Save spreadsheet',
      category: 'File'
    });
  }

  if (actions.onNewFile) {
    shortcuts.push({
      key: 'n',
      ctrlKey: true,
      action: actions.onNewFile,
      description: 'Upload new file',
      category: 'File'
    });
  }

  if (actions.onHelp) {
    shortcuts.push({
      key: 'F1',
      action: actions.onHelp,
      description: 'Show help',
      category: 'Help'
    });
  }

  if (actions.onZoomIn) {
    shortcuts.push({
      key: '=',
      ctrlKey: true,
      action: actions.onZoomIn,
      description: 'Zoom in',
      category: 'View'
    });
  }

  if (actions.onZoomOut) {
    shortcuts.push({
      key: '-',
      ctrlKey: true,
      action: actions.onZoomOut,
      description: 'Zoom out',
      category: 'View'
    });
  }

  if (actions.onToggleHistory) {
    shortcuts.push({
      key: 'h',
      ctrlKey: true,
      shiftKey: true,
      action: actions.onToggleHistory,
      description: 'Toggle history sidebar',
      category: 'View'
    });
  }

  if (actions.onToggleFeedback) {
    shortcuts.push({
      key: 'f',
      ctrlKey: true,
      shiftKey: true,
      action: actions.onToggleFeedback,
      description: 'Open feedback modal',
      category: 'Help'
    });
  }

  return shortcuts;
};