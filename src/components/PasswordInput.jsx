import { useState, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({ className, wrapperClassName = "w-full", onFocus, ...props }) {
  const [show, setShow] = useState(false);
  const inputRef = useRef(null);
  
  // Combine custom wrapper class
  const wrapClass = `relative ${wrapperClassName}`;
  
  // Ensure the input has padding on the right so text doesn't hide behind the icon
  const inputClass = `${className || ''} pr-10`;

  const handleFocus = (e) => {
    // Scroll element into view with a slight delay to allow keyboard animation
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
    if (onFocus) onFocus(e);
  };

  return (
    <div className={wrapClass}>
      <input 
        ref={inputRef}
        type={show ? 'text' : 'password'} 
        className={inputClass} 
        onFocus={handleFocus}
        {...props} 
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
