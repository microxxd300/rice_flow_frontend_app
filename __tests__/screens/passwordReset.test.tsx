import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/screens/ResetPasswordScreen';
import { authPasswordResetConfirm, authPasswordResetRequest } from '@/services/apiService';
import { translations } from '@/i18n/translations';

// The first render loads React Native for the first time, which takes over 5s on a clean CI run
jest.setTimeout(30000);

const tr = translations.en;
const mockNavigate = jest.fn();
const mockNavigateDeprecated = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, navigateDeprecated: mockNavigateDeprecated, goBack: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/i18n/useTranslation', () => ({
  useTranslation: () => jest.requireActual('@/i18n/translations').translations.en,
}));
jest.mock('@/services/apiService', () => ({
  authPasswordResetRequest: jest.fn(),
  authPasswordResetConfirm: jest.fn(),
}));

const request = authPasswordResetRequest as jest.Mock;
const confirm = authPasswordResetConfirm as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  request.mockResolvedValue({ data: {} });
  confirm.mockResolvedValue({ data: {} });
});

describe('ForgotPasswordScreen', () => {
  it('sends the code and opens the next screen', async () => {
    const ui = render(<ForgotPasswordScreen />);
    fireEvent.changeText(ui.getByPlaceholderText('juan@example.com'), ' juan@gmail.com ');
    fireEvent.press(ui.getByText(tr.fpSend));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('ResetPassword', { email: 'juan@gmail.com' }));
    expect(request).toHaveBeenCalledWith('juan@gmail.com');
  });

  it('sends a farmer with no real email to the agriculturist without calling the server', () => {
    const ui = render(<ForgotPasswordScreen />);
    fireEvent.changeText(ui.getByPlaceholderText('juan@example.com'), 'juanfarm');
    fireEvent.press(ui.getByText(tr.fpSend));
    expect(ui.getByText(tr.fpNoInbox)).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });

  it('starts with the email typed on the login screen', () => {
    mockParams = { email: 'juan@gmail.com' };
    const ui = render(<ForgotPasswordScreen />);
    expect(ui.getByDisplayValue('juan@gmail.com')).toBeTruthy();
  });

  it('says so when the phone is offline', async () => {
    request.mockRejectedValue(new Error('network'));
    const ui = render(<ForgotPasswordScreen />);
    fireEvent.changeText(ui.getByPlaceholderText('juan@example.com'), 'juan@gmail.com');
    fireEvent.press(ui.getByText(tr.fpSend));
    expect(await ui.findByText(tr.fpOffline)).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('ResetPasswordScreen', () => {
  const fill = (ui: ReturnType<typeof render>, code: string, password: string, again = password) => {
    fireEvent.changeText(ui.getByPlaceholderText('123456'), code);
    fireEvent.changeText(ui.getByPlaceholderText(tr.authPwRule), password);
    fireEvent.changeText(ui.getByPlaceholderText(tr.authPw2Ph), again);
    fireEvent.press(ui.getByText(tr.rpSave));
  };

  beforeEach(() => {
    mockParams = { email: 'juan@gmail.com' };
  });

  it('saves the new password and returns to login', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const ui = render(<ResetPasswordScreen />);
    fill(ui, '482913', 'Bagong-Palay-77');
    await waitFor(() => expect(mockNavigateDeprecated).toHaveBeenCalledWith('Login'));
    expect(confirm).toHaveBeenCalledWith({
      email: 'juan@gmail.com', code: '482913', new_password: 'Bagong-Palay-77', new_password2: 'Bagong-Palay-77',
    });
    expect(alert).toHaveBeenCalledWith(tr.rpDoneTitle, tr.rpDoneMsg);
  });

  it('checks the form before calling the server', () => {
    const ui = render(<ResetPasswordScreen />);
    fill(ui, '123', 'short', 'different');
    expect(ui.getByText(tr.rpBadCode)).toBeTruthy();
    expect(ui.getByText(tr.rpShortPw)).toBeTruthy();
    expect(ui.getByText(tr.rpMismatch)).toBeTruthy();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('shows a wrong code under the code box', async () => {
    const message = 'That code is wrong or has expired. Please request a new one.';
    confirm.mockRejectedValue({ response: { status: 400, data: { code: [message] } } });
    const ui = render(<ResetPasswordScreen />);
    fill(ui, '000000', 'Bagong-Palay-77');
    expect(await ui.findByText(message)).toBeTruthy();
    expect(mockNavigateDeprecated).not.toHaveBeenCalled();
  });

  it('shows a weak password under the password box', async () => {
    confirm.mockRejectedValue({ response: { status: 400, data: { new_password: ['This password is too common.'] } } });
    const ui = render(<ResetPasswordScreen />);
    fill(ui, '482913', 'password123');
    expect(await ui.findByText('This password is too common.')).toBeTruthy();
  });

  it('makes the farmer wait before asking for a new code', () => {
    const ui = render(<ResetPasswordScreen />);
    expect(ui.getByText(tr.rpResendIn.replace('{s}', '60'))).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });
});
