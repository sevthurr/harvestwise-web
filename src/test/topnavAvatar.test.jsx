import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from '../app/global/components/layout/TopBar';
import { AdminLayout } from '../app/global/components/layout/AdminLayout';
import { DFTCLayout } from '../app/global/components/layout/DFTCLayout';
import { ProfileAvatar } from '../app/global/components/profile/ProfileAvatar';
import { authApi } from '../services/api';
import * as notificationsApi from '../services/api/notificationsApi';

// Mutable so each test can swap the signed-in user's stored picture path.
const authState = vi.hoisted(() => ({
  user: { first_name: 'Ana', last_name: 'Reyes', role: { role_name: 'Farmer' } },
  logout: vi.fn(),
  refreshUser: vi.fn(async () => {}),
  patchUser: vi.fn(async () => {}),
}));

vi.mock('../app/global/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../app/global/contexts/BackgroundProcessContext', () => ({
  useBackgroundProcess: () => ({
    processState: {},
    triggerResync: vi.fn(),
  }),
}));

vi.mock('../services/api/notificationsApi', () => ({
  getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0 }),
  subscribeNotificationStream: vi.fn(() => () => {}),
}));

vi.mock('../services/api/authApi', async (importOriginal) => ({
  ...(await importOriginal()),
  uploadProfilePicture: vi.fn(),
}));

// The real cropper needs canvas + image decoding in jsdom. Swapped for a button
// that confirms with a stand-in file, so the upload path can be driven directly.
vi.mock('../app/global/components/profile/AvatarCropper', () => ({
  AvatarCropper: ({ onConfirm }) => (
    <button
      type="button"
      onClick={() => onConfirm(new File(['png'], 'avatar.png', { type: 'image/png' }))}
    >
      confirm-crop
    </button>
  ),
}));

const CLOUD_URL = 'https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill,g_face/harvestwise/profiles/farmer/avatar_usr-001_a1b2c3d4.png';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

beforeEach(() => {
  authState.user = { first_name: 'Ana', last_name: 'Reyes', role: { role_name: 'Farmer' } };
  authState.refreshUser.mockClear();
  authState.patchUser.mockClear();
  vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue({ unread_count: 0 });
});

function renderInProviders(ui, route = '/farmer/dashboard') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Topnav avatar reflects the uploaded profile picture', () => {
  it('shows the picture in the farmer TopBar circle', () => {
    authState.user.profile_picture_path = CLOUD_URL;
    renderInProviders(<TopBar notificationCount={0} onNotificationClick={vi.fn()} />);

    const img = screen.getByRole('img', { name: 'Ana Reyes' });
    expect(img).toHaveAttribute('src', CLOUD_URL);
    expect(screen.queryByText('AR')).not.toBeInTheDocument();
  });

  it('shows the picture in the account dropdown circle too', () => {
    authState.user.profile_picture_path = CLOUD_URL;
    renderInProviders(<TopBar notificationCount={0} onNotificationClick={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));

    // Button circle + dropdown identity row, both the picture.
    expect(screen.getAllByRole('img', { name: 'Ana Reyes' })).toHaveLength(2);
  });

  it('shows the picture in the DFTC topbar', async () => {
    authState.user = {
      first_name: 'Ana',
      last_name: 'Reyes',
      role: { role_name: 'DFTC' },
      profile_picture_path: CLOUD_URL,
    };
    renderInProviders(<DFTCLayout />, '/dftc');

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Ana Reyes' })).toHaveAttribute('src', CLOUD_URL);
    });
  });

  it('shows the picture in the Admin topbar', async () => {
    authState.user = {
      first_name: 'Ana',
      last_name: 'Reyes',
      role: { role_name: 'Admin' },
      profile_picture_path: CLOUD_URL,
    };
    renderInProviders(<AdminLayout />, '/admin');

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Ana Reyes' })).toHaveAttribute('src', CLOUD_URL);
    });
  });

  it('falls back to initials when no picture is stored', () => {
    authState.user.profile_picture_path = null;
    renderInProviders(<TopBar notificationCount={0} onNotificationClick={vi.fn()} />);

    expect(screen.getAllByText('AR').length).toBeGreaterThan(0);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('falls back to initials for a legacy /media path that no longer resolves', () => {
    authState.user.profile_picture_path = '/media/profiles/usr-001.png';
    renderInProviders(<TopBar notificationCount={0} onNotificationClick={vi.fn()} />);

    expect(screen.getAllByText('AR').length).toBeGreaterThan(0);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('falls back to initials when the image fails to load', () => {
    authState.user.profile_picture_path = CLOUD_URL;
    renderInProviders(<TopBar notificationCount={0} onNotificationClick={vi.fn()} />);

    fireEvent.error(screen.getByRole('img', { name: 'Ana Reyes' }));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getAllByText('AR').length).toBeGreaterThan(0);
  });

  it('replaces the picture after an upload without a reload', async () => {
    const newUrl = 'https://res.cloudinary.com/demo/image/upload/harvestwise/profiles/farmer/avatar_usr-001_ff00aa11.png';
    vi.mocked(authApi.uploadProfilePicture).mockResolvedValue({ profile_picture_path: newUrl });

    const { container } = render(
      <ProfileAvatar initials="AR" src={null} alt="Ana Reyes" />
    );
    expect(screen.getByText('AR')).toBeInTheDocument();

    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [new File(['png'], 'pick.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'confirm-crop' }));

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Ana Reyes' })).toHaveAttribute('src', newUrl);
    });
    // The path goes straight into the shared user object rather than only being
    // re-read from /auth/me, so the topnav avatars update on this render even if
    // that refresh is slow, fails, or is answered from a stale cache.
    expect(authState.patchUser).toHaveBeenCalledWith({ profile_picture_path: newUrl });
    // The refresh still runs, to reconcile with the server and IndexedDB.
    expect(authState.refreshUser).toHaveBeenCalled();
  });

  it('shows the topnav circle updating from the shared user object alone', async () => {
    // No re-render of ProfileAvatar, no /auth/me: the shared user object is the
    // only channel, which is exactly the situation the patch fixes.
    authState.user = {
      first_name: 'Ana',
      last_name: 'Reyes',
      role: { role_name: 'Farmer' },
      profile_picture_path: null,
    };
    const { rerender } = renderInProviders(<TopBar notificationCount={0} onNotificationClick={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    authState.user.profile_picture_path = CLOUD_URL;
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/farmer/dashboard']}>
          <TopBar notificationCount={0} onNotificationClick={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByRole('img', { name: 'Ana Reyes' })).toHaveAttribute('src', CLOUD_URL);
  });
});