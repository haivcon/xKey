import { useRef } from 'react';
import { useScrambledKeyboard } from '../contexts/ScrambledKeyboardContext';

export default function SecureTextarea({ className, secureLabel, onFocus, onClick, value, onChange, ...props }) {
  const ref = useRef(null);
  const scrambledKeyboard = useScrambledKeyboard();

  const openKeyboard = (event) => {
    if (!scrambledKeyboard.enabled) {
      onFocus?.(event);
      return;
    }
    ref.current?.blur();
    scrambledKeyboard.openKeyboard({
      value: value || '',
      onChange,
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
