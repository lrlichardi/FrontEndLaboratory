import { useCallback } from 'react';

type Opts = { submitOnLast?: boolean };

export function useEnterToNext({ submitOnLast = false }: Opts = {}) {
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Enter') return;

    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();

    // No interferir con textareas o inputs multiline de MUI
    if (tag === 'textarea' || target.getAttribute('data-enter-next') === 'ignore') return;

    const form = target.closest('form');
    if (!form) return;

    // Evitar submit por defecto y avanzar
    e.preventDefault();

    // Focusables dentro del form (podés ajustar el selector si querés)
    const focusables = Array.from(
      form.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), ' +
        'select:not([disabled]), textarea:not([disabled]), ' +
        '[tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('data-skip') && !el.getAttribute('aria-hidden'));

    const i = focusables.indexOf(target);
    const next = focusables[i + 1];

    if (next) {
      next.focus();
      // Selecciona el contenido si es input
      if ((next as HTMLInputElement).select) (next as HTMLInputElement).select();
    } else if (submitOnLast) {
      // Click al submit si existe
      (form.querySelector('[type="submit"]') as HTMLButtonElement)?.click();
    }
  }, [submitOnLast]);

  return { onKeyDown };
}
