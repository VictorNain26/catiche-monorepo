import { Button } from '@repo/ui';
import { cn } from '@repo/ui/classes';
import { DeleteIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CODE_DIGITS } from '../lib/student';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * The student's code, six digits: dots for what is typed, never the digits, and a keypad that
 * stays on the screen, the keyboard's digits too. `onKey` gets every key, Backspace included.
 */
export function CodePad({
  value,
  onKey,
  label,
  disabled = false,
}: {
  value: string;
  onKey: (key: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const onKeyRef = useRef(onKey);
  useEffect(() => {
    onKeyRef.current = onKey;
  }, [onKey]);
  // The keyboard types on the pad wherever the focus is, but in a field of the page.
  useEffect(() => {
    if (disabled) return;
    const type = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^[0-9]$/.test(event.key) || event.key === 'Backspace') {
        event.preventDefault();
        onKeyRef.current(event.key);
      }
    };
    window.addEventListener('keydown', type);
    return () => {
      window.removeEventListener('keydown', type);
    };
  }, [disabled]);

  return (
    <div role="group" aria-label={label} className="flex flex-col items-center gap-6">
      <p aria-live="polite" className="sr-only">
        {`${String(value.length)} chiffre${value.length > 1 ? 's' : ''} sur ${String(CODE_DIGITS)}`}
      </p>
      <div aria-hidden="true" className="flex gap-3">
        {Array.from({ length: CODE_DIGITS }, (_, index) => (
          <span key={index} className={cn('size-4 rounded-full border-2 border-primary', index < value.length && 'bg-primary')} />
        ))}
      </div>
      <div className="grid w-full max-w-xs grid-cols-3 gap-3">
        {KEYS.map((key) => (
          <PadKey key={key} digit={key} onKey={onKey} disabled={disabled} />
        ))}
        <span />
        <PadKey digit="0" onKey={onKey} disabled={disabled} />
        <Button
          variant="ghost"
          className="h-16"
          aria-label="Effacer le dernier chiffre"
          disabled={disabled || value.length === 0}
          onClick={() => {
            onKey('Backspace');
          }}
        >
          <DeleteIcon aria-hidden="true" nonScalingStroke className="size-6" />
        </Button>
      </div>
    </div>
  );
}

function PadKey({ digit, onKey, disabled }: { digit: string; onKey: (key: string) => void; disabled: boolean }) {
  return (
    <Button
      variant="outline"
      className="h-16 font-mono text-2xl"
      disabled={disabled}
      onClick={() => {
        onKey(digit);
      }}
    >
      {digit}
    </Button>
  );
}
