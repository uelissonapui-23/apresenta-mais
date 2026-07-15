import { useState, useEffect } from "react";

const TOAST_LIMIT = 3;

const VARIANT_DURATIONS = {
  success: 3500,
  default: 5000,
  info: 5000,
  warning: 7000,
  destructive: 8000,
  error: 8000,
  critical: 0,
};

function getDurationForVariant(variant, customDuration) {
  if (customDuration !== undefined && customDuration !== null) {
    return customDuration;
  }

  const key = String(variant || 'default').toLowerCase();
  return VARIANT_DURATIONS[key] ?? VARIANT_DURATIONS.default;
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
  PAUSE_TOAST: "PAUSE_TOAST",
  RESUME_TOAST: "RESUME_TOAST",
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const toastTimers = new Map();
const toastPausedAt = new Map();
const toastRemaining = new Map();

function clearFromTimer(toastId) {
  const timer = toastTimers.get(toastId);
  if (timer) {
    clearTimeout(timer);
    toastTimers.delete(toastId);
  }
}

function scheduleRemoval(toastId, duration) {
  if (duration <= 0) return;

  clearFromTimer(toastId);

  const timer = setTimeout(() => {
    toastTimers.delete(toastId);
    toastRemaining.delete(toastId);
    toastPausedAt.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    });
  }, duration);

  toastTimers.set(toastId, timer);
  toastRemaining.set(toastId, duration);
}

function pauseToast(toastId) {
  const timer = toastTimers.get(toastId);
  if (!timer) return;

  clearTimeout(timer);
  const remaining = toastRemaining.get(toastId) || 0;
  const pausedAt = Date.now();
  toastPausedAt.set(toastId, pausedAt);
  toastRemaining.set(toastId, remaining);
}

function resumeToast(toastId) {
  const pausedAt = toastPausedAt.get(toastId);
  if (!pausedAt) return;

  const elapsed = Date.now() - pausedAt;
  const remaining = Math.max(0, (toastRemaining.get(toastId) || 0) - elapsed);

  toastPausedAt.delete(toastId);
  toastRemaining.set(toastId, remaining);

  scheduleRemoval(toastId, remaining);
}

export const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = toastId ? { toastId } : { toastId: undefined };

      if (toastId) {
        clearFromTimer(toastId);
      } else {
        state.toasts.forEach((toast) => clearFromTimer(toast.id));
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    case actionTypes.PAUSE_TOAST:
      if (action.toastId) {
        pauseToast(action.toastId);
      } else {
        state.toasts.forEach((toast) => pauseToast(toast.id));
      }
      return state;
    case actionTypes.RESUME_TOAST:
      if (action.toastId) {
        resumeToast(action.toastId);
      } else {
        state.toasts.forEach((toast) => resumeToast(toast.id));
      }
      return state;
  }
};

const listeners = [];

let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function toast({ ...props }) {
  const id = genId();

  const variant = props.variant || 'default';
  const duration = getDurationForVariant(variant, props.duration);

  const update = (props) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    });

  const dismiss = () =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      duration,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  if (duration > 0) {
    scheduleRemoval(id, duration);
  }

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
    pause: (toastId) => dispatch({ type: actionTypes.PAUSE_TOAST, toastId }),
    resume: (toastId) => dispatch({ type: actionTypes.RESUME_TOAST, toastId }),
  };
}

export { useToast, toast };