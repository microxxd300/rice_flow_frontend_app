import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * True while the on-screen keyboard is showing. The floating tab bar hides then,
 * so it never covers the field being typed in (on Android the bar can ride up with
 * the keyboard, depending on how the window resizes).
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return open;
}
