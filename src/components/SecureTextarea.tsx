import { useRef, type ChangeEventHandler, type FocusEvent, type MouseEvent, type TextareaHTMLAttributes } from 'react';
import { useScrambledKeyboard } from '../contexts/ScrambledKeyboardContext';

type SecureTextareaEvent = FocusEvent<HTMLTextAreaElement> | MouseEvent<HTMLTextAreaElement>;
type SecureTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onFocus' | 'onClick' | 'onChange'> & {
  secureLabel?: string;
  onFocus?: (event: SecureTextareaEvent) => void;
  onClick?: (event: MouseEvent<HTMLTextAreaElement>) => void;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
};

export default function SecureTextarea({ className, secureLabel, onFocus, onClick, value, onChange, ...props }: SecureTextareaProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const scrambledKeyboard = useScrambledKeyboard();

  const openKeyboard = (event: SecureTextareaEvent) => {
    if (!scrambledKeyboard.enabled) {
      onFocus?.(event);
      return;
    }
    ref.current?.blur();
    scrambledKeyboard.openKeyboard({
      value: String(value || ''),
      onChange: onChange as ((event: { target: { value: string } }) => void) | undefined,
      label: secureLabel || props.placeholder || '',
    });
    onFocus?.(event);
  };

  return (
    <textarea
      ref={ref}
      {...props}
      value={value}
      onChange={onChange}
      onFocus={openKeyboard}
      onClick={(event) => {
        onClick?.(event);
        if (scrambledKeyboard.enabled) openKeyboard(event);
      }}
      readOnly={scrambledKeyboard.enabled || props.readOnly}
      inputMode={scrambledKeyboard.enabled ? 'none' : props.inputMode}
      className={className}
      data-secure-input="true"
    />
  );
}
