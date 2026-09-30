import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvatarCropper } from '../app/global/components/profile/AvatarCropper';

// jsdom has no canvas backend — stub just enough for drawImage/toBlob.
const drawImage = vi.fn();
let lastBlob = null;
let canvasSizes = [];

beforeEach(() => {
  lastBlob = null;
  canvasSizes = [];
  drawImage.mockClear();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    drawImage,
    setTransform: vi.fn(),
  }));
  HTMLCanvasElement.prototype.toBlob = function (cb) {
    lastBlob = new Blob(['png'], { type: 'image/png' });
    cb(lastBlob);
  };
  // Stand in for createImageBitmap so decoding resolves with known dimensions.
  globalThis.createImageBitmap = vi.fn(async () => ({ width: 1000, height: 500 }));
});

const file = () => new File(['x'], 'me.png', { type: 'image/png' });

describe('AvatarCropper', () => {
  it('opens on a circular guide and only uploads after confirming', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<AvatarCropper file={file()} onCancel={onCancel} onConfirm={onConfirm} />);

    await waitFor(() => expect(screen.getByText(/Crop your photo/i)).toBeInTheDocument());
    expect(onConfirm).not.toHaveBeenCalled();

    // The crop window is a circle: the preview canvas is square but styled round.
    expect(document.querySelector('canvas').style.borderRadius).toBe('50%');

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));

    const [blob] = onConfirm.mock.calls[0];
    expect(blob.name).toBe('avatar.png');
    expect(blob.type).toBe('image/png');
    expect(lastBlob).toBeTruthy();

    // The confirming draw targets the 400px export canvas, not the 280px preview.
    // Source is 1000x500, so export scale = 400/500 -> drawn at 800x400, centred.
    const geometry = drawImage.mock.calls.map(([, x, y, w, h]) => [x, y, w, h]);
    expect(geometry).toContainEqual([-200, 0, 800, 400]);
    expect(geometry).toContainEqual([-140, 0, 560, 280]); // the preview underneath
  });

  it('does not darken the page outside the crop box', async () => {
    render(<AvatarCropper file={file()} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Crop your photo/i)).toBeInTheDocument());

    // Regression: a `box-shadow: 0 0 0 9999px` spread on the guide escapes the
    // modal card and dims the entire viewport. Nothing may spread beyond a hairline.
    const guide = screen.getByTestId('crop-guide');
    const container = guide.parentElement;

    expect(guide.style.boxShadow || '').not.toMatch(/9999/);
    expect(container.style.boxShadow).toBe('0 0 0 2px rgba(255,255,255,0.9)');

    // The corner dimming is contained by a radial mask on the 280px crop box.
    expect(guide.style.maskImage).toContain('radial-gradient');
    expect(guide.style.maskImage).toContain('transparent 0 140px');
    expect(guide.className).toContain('inset-0');
  });

  it('exports a square 400x400 canvas', async () => {
    const onConfirm = vi.fn();
    const created = [];
    const realCreate = document.createElement.bind(document);
    const spy = vi.spyOn(document, 'createElement').mockImplementation((tag, ...rest) => {
      const el = realCreate(tag, ...rest);
      if (String(tag).toLowerCase() === 'canvas') created.push(el);
      return el;
    });

    try {
      render(<AvatarCropper file={file()} onCancel={vi.fn()} onConfirm={onConfirm} />);
      await waitFor(() => expect(screen.getByText(/Crop your photo/i)).toBeInTheDocument());
      created.length = 0; // drop the preview canvas

      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
      await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));

      // Exactly one off-screen canvas, square, at the avatar export size.
      expect(created).toHaveLength(1);
      expect(created[0].width).toBe(400);
      expect(created[0].height).toBe(400);
    } finally {
      spy.mockRestore();
    }
  });

  it('cancelling without confirming never uploads', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<AvatarCropper file={file()} onCancel={onCancel} onConfirm={onConfirm} />);
    await waitFor(() => expect(screen.getByText(/Crop your photo/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('zoom slider repaints the preview', async () => {
    render(<AvatarCropper file={file()} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    await waitFor(() => expect(screen.getByLabelText(/zoom/i)).toBeInTheDocument());

    expect(drawImage).toHaveBeenCalled();
    const before = drawImage.mock.calls.length;
    fireEvent.change(screen.getByLabelText(/zoom/i), { target: { value: '2' } });

    await waitFor(() => expect(drawImage.mock.calls.length).toBeGreaterThan(before));
  });

  it('reads EXIF orientation when the browser supports createImageBitmap', async () => {
    render(<AvatarCropper file={file()} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    await waitFor(() => expect(drawImage).toHaveBeenCalled());
    expect(createImageBitmap).toHaveBeenCalledWith(
      expect.any(File),
      { imageOrientation: 'from-image' }
    );
  });
});
