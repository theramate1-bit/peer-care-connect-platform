/**
 * Tests for useToast reducer (pure logic)
 */
import { reducer } from '../use-toast';

describe('use-toast reducer', () => {
  const initialState = { toasts: [] };

  describe('ADD_TOAST', () => {
    it('adds toast to state', () => {
      const state = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: { id: '1', title: 'Test', open: true },
      });
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].title).toBe('Test');
      expect(state.toasts[0].id).toBe('1');
    });

    it('limits toasts to limit (1)', () => {
      let state = reducer(initialState, {
        type: 'ADD_TOAST',
        toast: { id: '1', title: 'First', open: true },
      });
      state = reducer(state, {
        type: 'ADD_TOAST',
        toast: { id: '2', title: 'Second', open: true },
      });
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].id).toBe('2');
    });
  });

  describe('UPDATE_TOAST', () => {
    it('updates matching toast by id', () => {
      const state = reducer(
        { toasts: [{ id: '1', title: 'Old', open: true }] },
        { type: 'UPDATE_TOAST', toast: { id: '1', title: 'New' } }
      );
      expect(state.toasts[0].title).toBe('New');
    });

    it('leaves other toasts unchanged', () => {
      const state = reducer(
        { toasts: [{ id: '1', title: 'A', open: true }, { id: '2', title: 'B', open: true }] },
        { type: 'UPDATE_TOAST', toast: { id: '1', title: 'Updated' } }
      );
      expect(state.toasts[0].title).toBe('Updated');
      expect(state.toasts[1].title).toBe('B');
    });
  });

  describe('DISMISS_TOAST', () => {
    it('sets open to false for matching toast', () => {
      const state = reducer(
        { toasts: [{ id: '1', title: 'T', open: true }] },
        { type: 'DISMISS_TOAST', toastId: '1' }
      );
      expect(state.toasts[0].open).toBe(false);
    });

    it('sets all toasts open to false when no toastId', () => {
      const state = reducer(
        { toasts: [{ id: '1', open: true }, { id: '2', open: true }] },
        { type: 'DISMISS_TOAST' }
      );
      expect(state.toasts.every((t) => t.open === false)).toBe(true);
    });
  });

  describe('REMOVE_TOAST', () => {
    it('removes toast by id', () => {
      const state = reducer(
        { toasts: [{ id: '1' }, { id: '2' }] },
        { type: 'REMOVE_TOAST', toastId: '1' }
      );
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].id).toBe('2');
    });

    it('clears all toasts when toastId undefined', () => {
      const state = reducer(
        { toasts: [{ id: '1' }, { id: '2' }] },
        { type: 'REMOVE_TOAST', toastId: undefined }
      );
      expect(state.toasts).toHaveLength(0);
    });
  });
});
