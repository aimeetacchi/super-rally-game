import { useEffect, useMemo, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Gauge } from 'lucide-react';
import { TouchInput, type TouchAction } from './touch-input';

const controls = [
  { action: 'LEFT', label: 'Left', icon: ArrowLeft },
  { action: 'RIGHT', label: 'Right', icon: ArrowRight },
  { action: 'SPACE', label: 'Drift', icon: Gauge },
  { action: 'DOWN', label: 'Brake', icon: ArrowDown },
  { action: 'UP', label: 'Go', icon: ArrowUp },
] as const;

export function TouchControls({
  visible,
  enabled,
  onControl,
}: {
  visible: boolean;
  enabled: boolean;
  onControl: (action: TouchAction, pressed: boolean) => void;
}) {
  const input = useMemo(() => new TouchInput(onControl), [onControl]);
  const [held, setHeld] = useState<Set<TouchAction>>(new Set());
  const refresh = () => setHeld(input.actions);

  useEffect(() => {
    const clear = () => {
      input.clear();
      setHeld(new Set());
    };
    const visibility = () => {
      if (document.hidden) clear();
    };
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility);
      input.clear();
    };
  }, [input]);

  useEffect(() => {
    if (!enabled) {
      input.clear();
      setHeld(new Set());
    }
  }, [enabled, input]);

  function press(event: PointerEvent<HTMLButtonElement>, action: TouchAction) {
    if (!enabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    input.press(event.pointerId, action);
    refresh();
  }

  function release(event: PointerEvent<HTMLButtonElement>) {
    input.release(event.pointerId);
    refresh();
  }

  function keyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    action: TouchAction,
    pressed: boolean,
    id: number,
  ) {
    if (event.code !== 'Space' && event.code !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
    if (enabled && pressed) input.press(id, action);
    else input.release(id);
    refresh();
  }

  return (
    <div
      className="touch-controls"
      hidden={!visible}
      aria-label="Touch driving controls"
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="touch-hint">Hold GO + steer with your other thumb</span>
      <div className="touch-pads">
        {[controls.slice(0, 2), controls.slice(2)].map((group, index) => (
          <div className={`touch-group ${index === 0 ? 'steering-pad' : 'pedal-pad'}`} key={index}>
            {group.map(({ action, label, icon: Icon }) => (
              <button
                key={action}
                className={`touch-button touch-${action.toLowerCase()}`}
                disabled={!enabled}
                aria-label={`${action === 'UP' ? 'Accelerate' : action === 'SPACE' ? 'Handbrake drift' : label} (hold)`}
                data-held={held.has(action)}
                onPointerDown={(event) => press(event, action)}
                onPointerUp={release}
                onPointerCancel={release}
                onLostPointerCapture={release}
                onKeyDown={(event) =>
                  keyboard(event, action, true, -controls.findIndex((c) => c.action === action) - 1)
                }
                onKeyUp={(event) =>
                  keyboard(
                    event,
                    action,
                    false,
                    -controls.findIndex((c) => c.action === action) - 1,
                  )
                }
                onBlur={() => {
                  input.release(-controls.findIndex((c) => c.action === action) - 1);
                  refresh();
                }}
              >
                <Icon size={23} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
