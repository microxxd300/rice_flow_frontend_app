import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/Button';

describe('Button Component', () => {
  it('renders button with label', () => {
    const { getByText } = render(<Button label="Test Button" onPress={() => {}} />);
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when clicked', () => {
    const onPressMock = jest.fn();
    const { getByRole } = render(
      <Button label="Click Me" onPress={onPressMock} />
    );
    
    const button = getByRole('button');
    fireEvent.press(button);
    
    expect(onPressMock).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    const onPressMock = jest.fn();
    const { getByRole } = render(
      <Button label="Disabled" onPress={onPressMock} disabled />
    );
    
    const button = getByRole('button');
    fireEvent.press(button);
    
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('renders with different variants', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost'] as const;
    
    variants.forEach(variant => {
      const { getByText } = render(
        <Button label={`${variant} Button`} onPress={() => {}} variant={variant} />
      );
      expect(getByText(`${variant} Button`)).toBeTruthy();
    });
  });
});
