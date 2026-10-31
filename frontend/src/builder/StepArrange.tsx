/**
 * Step 2: arrange.
 *
 * The bouquet is laid out automatically on arrival. From there the sender can
 * shuffle for a new composition, drag individual blooms, turn one by holding R
 * and moving the mouse, and undo or redo.
 *
 * History is committed per gesture, not per frame: dragging and turning fire
 * continuously but only the state before the gesture is pushed, so one drag
 * (or one hold of R) is one undo.
 */

import { useCallback, useRef, useState, type Dispatch } from 'react';
import BouquetCanvas from '../components/BouquetCanvas';
import { Button, ChoiceGroup } from '../components/ui';
import { useArtColors } from '../lib/theme';
import { useHistory, useUndoShortcuts } from '../lib/useHistory';
import type { FlowerPlacement, GreeneryType } from '../types/bouquet';
import type { BuilderAction, BuilderState } from './builderState';

const GREENERY_OPTIONS: readonly { value: GreeneryType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'eucalyptus', label: 'Eucalyptus' },
  { value: 'fern', label: 'Fern' },
  { value: 'babys-breath', label: "Baby's breath" },
];

interface Props {
  state: BuilderState;
  dispatch: Dispatch<BuilderAction>;
}

export default function StepArrange({ state, dispatch }: Props) {
  const { paper, ink } = useArtColors();
  // The history tracks the live flower list. It needs no manual resetting:
  // the wizard unmounts this step on every navigation, so arriving at step 2
  // with a different bouquet always starts with an empty stack.
  const history = useHistory<FlowerPlacement[]>(state.flowers);
  const [selected, setSelected] = useState<number | null>(null);
  const dragStart = useRef<FlowerPlacement[] | null>(null);

  const applyUndo = useCallback(() => {
    const previous = history.undo();
    if (previous) dispatch({ type: 'setFlowers', flowers: previous });
  }, [history, dispatch]);

  const applyRedo = useCallback(() => {
    const next = history.redo();
    if (next) dispatch({ type: 'setFlowers', flowers: next });
  }, [history, dispatch]);

  useUndoShortcuts(applyUndo, applyRedo);

  const handleMove = useCallback(
    (index: number, x: number, y: number) => {
      // Remember where the bouquet was when this gesture began.
      if (!dragStart.current) dragStart.current = state.flowers;
      dispatch({ type: 'dragFlower', index, x, y });
    },
    [dispatch, state.flowers],
  );

  const handleRotate = useCallback(
    (index: number, rotation: number) => {
      if (!dragStart.current) dragStart.current = state.flowers;
      dispatch({ type: 'rotateFlower', index, rotation });
    },
    [dispatch, state.flowers],
  );

  const handleMoveEnd = useCallback(() => {
    const before = dragStart.current;
    dragStart.current = null;
    if (before) history.record(before);
  }, [history]);

  const handleShuffle = useCallback(() => {
    history.record(state.flowers);
    dispatch({ type: 'shuffle' });
    setSelected(null);
  }, [history, dispatch, state.flowers]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div>
        <div className="relative overflow-hidden rounded-card border border-line bg-surface shadow-petal">
          <BouquetCanvas
            scene={state}
            paper={paper}
            ink={ink}
            onMoveFlower={handleMove}
            onRotateFlower={handleRotate}
            onMoveEnd={handleMoveEnd}
            selectedIndex={selected}
            onSelect={setSelected}
            className="aspect-square w-full"
            title="Your bouquet. Drag a flower to move it, hold R and move the mouse to turn it, or focus one and use the arrow keys."
          />
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleShuffle} className="flex-1">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M17 3.5 22 8l-5 4.5V9.5h-2.3c-1.2 0-2.3.6-3 1.6l-4 5.9A5.6 5.6 0 0 1 3 19.5H2v-3h1c1.2 0 2.3-.6 3-1.6l4-5.9a5.6 5.6 0 0 1 4.7-2.5H17Z" />
              <path d="M17 11.5 22 16l-5 4.5v-3h-2.3a5.6 5.6 0 0 1-4-1.7l1.9-2.8c.6.9 1.6 1.5 2.8 1.5H17Z" />
              <path d="M2 4.5h1a5.6 5.6 0 0 1 4.3 2l-1.9 2.8A2.9 2.9 0 0 0 3 7.5H2Z" />
            </svg>
            Shuffle
          </Button>
          <Button
            variant="secondary"
            onClick={applyUndo}
            disabled={!history.canUndo}
            aria-keyshortcuts="Control+Z"
            title="Undo (Ctrl+Z)"
          >
            Undo
          </Button>
          <Button
            variant="secondary"
            onClick={applyRedo}
            disabled={!history.canRedo}
            aria-keyshortcuts="Control+Shift+Z"
            title="Redo (Ctrl+Shift+Z)"
          >
            Redo
          </Button>
        </div>

        <div className="rounded-card border border-line bg-sunk p-4">
          <ChoiceGroup
            legend="Greenery"
            options={GREENERY_OPTIONS}
            value={state.greenery}
            onChange={(greenery) => dispatch({ type: 'setGreenery', greenery })}
          />
        </div>
      </div>
    </div>
  );
}
