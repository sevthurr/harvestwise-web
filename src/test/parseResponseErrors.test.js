import { describe, it, expect } from 'vitest';
import { parseResponse } from '../app/global/api';

// `parseResponse` adopted `body.detail` whenever it was truthy. FastAPI returns
// `detail` as a *list* for 422 validation errors, and `new Error(list)` coerces
// through String(), so the admin screens rendered the literal "[object Object]"
// — a truthy string that also defeated every `err.message || "Unable to load
// ..."` fallback in the hooks.

function res(status, body) {
  return {
    ok: false,
    status,
    json: async () => body,
  };
}

async function messageOf(status, body) {
  try {
    await parseResponse(res(status, body));
    throw new Error('expected parseResponse to throw');
  } catch (err) {
    return err.message;
  }
}

describe('parseResponse error messages', () => {
  it('uses a string detail verbatim', async () => {
    await expect(messageOf(404, { detail: "Commodity 'COM-0001' not found." })).resolves.toBe(
      "Commodity 'COM-0001' not found."
    );
  });

  it('flattens a 422 validation list instead of stringifying objects', async () => {
    const msg = await messageOf(422, {
      detail: [
        {
          type: 'missing',
          loc: ['query', 'commodity_id'],
          msg: 'Field required',
          input: null,
        },
      ],
    });

    expect(msg).not.toContain('[object Object]');
    expect(msg).toBe('query.commodity_id: Field required');
  });

  it('joins every validation problem', async () => {
    const msg = await messageOf(422, {
      detail: [
        { loc: ['query', 'commodity_id'], msg: 'Field required' },
        { loc: ['query', 'page'], msg: 'Input should be greater than or equal to 1' },
      ],
    });

    expect(msg).not.toContain('[object Object]');
    expect(msg).toContain('query.commodity_id: Field required');
    expect(msg).toContain('query.page: Input should be greater than or equal to 1');
  });

  it('falls back to the status when detail is a plain object', async () => {
    await expect(messageOf(500, { detail: { reason: 'boom' } })).resolves.toBe(
      'Request failed (500)'
    );
  });

  it('falls back to the status when there is no body', async () => {
    await expect(messageOf(503, {})).resolves.toBe('Request failed (503)');
  });

  it('keeps the status on the error for diagnosis', async () => {
    try {
      await parseResponse(res(422, { detail: [{ loc: ['query', 'x'], msg: 'bad' }] }));
      throw new Error('expected parseResponse to throw');
    } catch (err) {
      expect(err.status).toBe(422);
    }
  });

  it('returns the parsed body on success', async () => {
    await expect(parseResponse({ ok: true, status: 200, json: async () => ({ a: 1 }) })).resolves.toEqual({
      a: 1,
    });
  });
});
