// Accessibility utilities for WCAG compliance

export interface AccessibilityOptions {
  announceToScreenReader?: boolean;
  focusManagement?: boolean;
  keyboardNavigation?: boolean;
}

// Screen reader announcements
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Focus management utilities
export const focusManagement = {
  // Trap focus within an element
  trapFocus: (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  },

  // Save and restore focus
  saveFocus: () => {
    const activeElement = document.activeElement as HTMLElement;
    return () => {
      if (activeElement && activeElement.focus) {
        activeElement.focus();
      }
    };
  },

  // Focus first error in a form
  focusFirstError: (container: HTMLElement) => {
    const errorElement = container.querySelector('[aria-invalid="true"], .error') as HTMLElement;
    if (errorElement) {
      errorElement.focus();
      errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },
};

// Keyboard navigation utilities
export const keyboardNavigation = {
  // Handle arrow key navigation in grids/lists
  handleArrowKeys: (
    event: KeyboardEvent,
    currentIndex: number,
    totalItems: number,
    itemsPerRow: number,
    onNavigate: (newIndex: number) => void
  ) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowUp':
        newIndex = Math.max(0, currentIndex - itemsPerRow);
        break;
      case 'ArrowDown':
        newIndex = Math.min(totalItems - 1, currentIndex + itemsPerRow);
        break;
      case 'ArrowLeft':
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowRight':
        newIndex = Math.min(totalItems - 1, currentIndex + 1);
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = totalItems - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    onNavigate(newIndex);
  },

  // Handle escape key
  handleEscape: (callback: () => void) => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  },
};

// Color contrast utilities
export const colorContrast = {
  // Calculate relative luminance
  getLuminance: (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  // Calculate contrast ratio
  getContrastRatio: (color1: [number, number, number], color2: [number, number, number]): number => {
    const lum1 = colorContrast.getLuminance(...color1);
    const lum2 = colorContrast.getLuminance(...color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  },

  // Check if contrast meets WCAG standards
  meetsWCAG: (
    color1: [number, number, number],
    color2: [number, number, number],
    level: 'AA' | 'AAA' = 'AA',
    size: 'normal' | 'large' = 'normal'
  ): boolean => {
    const ratio = colorContrast.getContrastRatio(color1, color2);
    
    if (level === 'AAA') {
      return size === 'large' ? ratio >= 4.5 : ratio >= 7;
    } else {
      return size === 'large' ? ratio >= 3 : ratio >= 4.5;
    }
  },
};

// ARIA utilities
export const aria = {
  // Generate unique IDs for ARIA relationships
  generateId: (prefix: string = 'aria'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // Set up ARIA relationships
  setupRelationship: (
    trigger: HTMLElement,
    target: HTMLElement,
    relationship: 'describedby' | 'labelledby' | 'controls' | 'owns'
  ) => {
    const id = target.id || aria.generateId();
    target.id = id;
    trigger.setAttribute(`aria-${relationship}`, id);
  },

  // Update live region
  updateLiveRegion: (element: HTMLElement, message: string, priority: 'polite' | 'assertive' = 'polite') => {
    element.setAttribute('aria-live', priority);
    element.textContent = message;
  },
};

// Validation for accessibility
export const validateAccessibility = {
  // Check if element has accessible name
  hasAccessibleName: (element: HTMLElement): boolean => {
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.textContent?.trim() ||
      (element as HTMLInputElement).placeholder ||
      element.getAttribute('title')
    );
  },

  // Check if interactive element is keyboard accessible
  isKeyboardAccessible: (element: HTMLElement): boolean => {
    const tabIndex = element.getAttribute('tabindex');
    return (
      element.tagName === 'BUTTON' ||
      element.tagName === 'A' ||
      element.tagName === 'INPUT' ||
      element.tagName === 'SELECT' ||
      element.tagName === 'TEXTAREA' ||
      (tabIndex !== null && tabIndex !== '-1')
    );
  },

  // Check if form field has proper labeling
  hasProperLabeling: (input: HTMLInputElement): boolean => {
    const id = input.id;
    if (!id) return false;

    const label = document.querySelector(`label[for="${id}"]`);
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');

    return !!(label || ariaLabel || ariaLabelledBy);
  },
};

// Screen reader only text utility
export const srOnly = 'sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';

// High contrast mode detection
export const detectHighContrast = (): boolean => {
  // Create a test element to detect high contrast mode
  const testElement = document.createElement('div');
  testElement.style.cssText = `
    position: absolute;
    top: -999px;
    width: 1px;
    height: 1px;
    background-color: rgb(31, 41, 59);
    border: 1px solid rgb(31, 41, 59);
  `;
  
  document.body.appendChild(testElement);
  
  const computedStyle = window.getComputedStyle(testElement);
  const isHighContrast = computedStyle.backgroundColor !== computedStyle.borderColor;
  
  document.body.removeChild(testElement);
  
  return isHighContrast;
};

// Reduced motion detection
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};