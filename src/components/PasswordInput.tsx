import { useState, useRef, type ChangeEventHandler, type FocusEvent, type InputHTMLAttributes, type MouseEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useScrambledKeyboard } from '../contexts/ScrambledKeyboardContext';

type PasswordInputEvent = FocusEvent<HTMLInputElement> | MouseEvent<HTMLInputElement>;
type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onFocus' | 'onClick' | 'onChange'> & {
  wrapperClassName?: string;
  secureLabel?: string;
  onFocus?: (event: PasswordInputEvent) => void;
  onClick?: (event: MouseEvent<HTMLInputElement>) => void;
  onChange?: ChangeEventHandler<HTMLInputElement>;
};

export default function PasswordInput({ className, wrapperClassName = "w-full", onFocus, secureLabel, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrambledKeyboard = useScrambledKeyboard();
  
  // Combine custom wrapper class
  const wrapClass = `relative ${wrapperClassName}`;
  
  // Ensure the input has padding on the right so text doesn't hide behind the icon
  const inputClass = `${className || ''} pr-10`;

  const handleFocus = (e: PasswordInputEvent) => {
    if (scrambledKeyboard.enabled) {
      inputRef.current?.blur();
      scrambledKeyboard.openKeyboard({
        value: String(props.value || ''),
        onChange: props.onChange as ((event: { target: { value: string } }) => void) | undefined,
        label: secureLabel || props.placeholder || '',
      });
      if (onFocus) onFocus(e);
      return;
    }
    // Scroll element into view with a slight delay to allow keyboard animation
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
    if (onFocus) onFocus(e);
  };

  return (
    <div className={wrapClass} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <input 
        ref={inputRef}
        {...props}
        type={show ? 'text' : 'password'} 
        className={inputClass} 
        onFocus={handleFocus}
        onClick={(e) => {
          props.onClick?.(e);
          if (scrambledKeyboard.enabled) handleFocus(e);
        }}
        readOnly={scrambledKeyboard.enabled || props.readOnly}
        inputMode={scrambledKeyboard.enabled ? 'none' : props.inputMode}
        data-secure-input="true"
      />
      <button 
        type="button"
        onClick={() => setShow(!show)} 
        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white p-1 focus:outline-none"
        title={show ? "Hide" : "Show"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
