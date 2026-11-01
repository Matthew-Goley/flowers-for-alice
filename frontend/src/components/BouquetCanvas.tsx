/**
 * The bouquet itself: one square SVG that every surface reuses.
 *
 * The builder steps and the home page all render this same component, which
 * is the only way the bouquet that gets arranged is guaranteed to be the
 * bouquet the home page shows.
 *
 * Layer order, back to front: stems, greenery, blooms, sleeve, ribbon. Blooms
 * are sorted by their y position so lower flowers overlap higher ones, and
 * repeats of one kind are drawn as different instances (see `variantsFor`).
 * Greenery is filler placed among the blooms, so it is computed from them.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type RefObject,
} from 'react';
import type { BouquetMode, FlowerPlacement, GreeneryType, WrapStyle } from '../types/bouquet';
import { FLOWERS } from './flowers';
import Greenery from './greenery/Greenery';
import WrapPaper, { Ribbon } from './wraps/WrapPaper';
import { BINDING_POINT, variantsFor } from '../lib/arrange';

const STEM_COLOR = '#6d8c63';

/** Degrees of turn per screen pixel of horizontal mouse travel while R is held. */
const ROTATE_DEGREES_PER_PX = 0.6;

/** True when a key press belongs to a text field rather than the canvas. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/** Nominal bloom size: a scale of 1 draws the flower at this fraction of the canvas. */
const BLOOM_SIZE = 34;
const LETTER_BLOOM_SIZE = 34;

export interface BouquetScene {
  mode: BouquetMode;
  flowers: readonly FlowerPlacement[];
  greenery: GreeneryType;
  wrap: WrapStyle;
  ribbon: string;
  mono: boolean;
}

export interface BouquetCanvasProps {
  scene: BouquetScene;
  /** Colour behind the art; mono flowers use it as their occluding fill. */
  paper: string;
  /**
   * Line colour. Set as the SVG's `color`, which is what `currentColor` in the
   * mono art resolves to. Passed explicitly rather than inherited from CSS so
   * the SVG stays self-contained.
   */
  ink: string;
  /** Draw only the wrapped sleeve, for a bouquet that has not been opened. */
  sealed?: boolean;
  /**
   * Fill the square with `paper` behind the art. On by default; the home page
   * turns it off so the photos behind the bouquet show around it.
   */
  ground?: boolean;
  /** Show only the first N blooms. Drives the one-by-one reveal. */
  visibleCount?: number;
  /** Enables dragging. Receives canvas-space coordinates (0-100). */
  onMoveFlower?: (index: number, x: number, y: number) => void;
  /**
   * Enables rotating: hold R and move the mouse to turn the selected flower
   * (or the one being dragged). Receives an absolute angle in degrees.
   */
  onRotateFlower?: (index: number, rotation: number) => void;
  /** Called once a drag or rotate gesture finishes, so history can record one step. */
  onMoveEnd?: () => void;
  selectedIndex?: number | null;
  onSelect?: (index: number | null) => void;
  svgRef?: RefObject<SVGSVGElement | null>;
  className?: string;
  /** Accessible description. Omit only if a parent already labels the art. */
  title?: string;
}

/** Convert a pointer position to canvas coordinates. */
function toCanvasPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const local = point.matrixTransform(ctm.inverse());
  return { x: local.x, y: local.y };
}

export default function BouquetCanvas({
  scene,
  paper,
  ink,
  sealed = false,
  ground = true,
  visibleCount,
  onMoveFlower,
  onRotateFlower,
  onMoveEnd,
  selectedIndex = null,
  onSelect,
  svgRef,
  className,
  title,
}: BouquetCanvasProps): ReactElement {
  const localRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef<number | null>(null);
  // R is held: mouse movement turns a flower instead of moving it. The ref is
  // what the pointer handler reads; the state only drives the cursor.
  const rHeldRef = useRef(false);
  const [rHeld, setRHeld] = useState(false);
  // The rotate gesture in progress: which flower, and where it started.
  const rotateRef = useRef<{ index: number; startX: number; startRotation: number } | null>(
    null,
  );
  // Touch: every pointer currently down on the canvas, and the two-finger
  // twist in progress. Phones have no R key, so on touch screens the same
  // rotation is a twist: hold a flower and turn a second finger around it.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const twistRef = useRef<{
    index: number;
    /** The two pointers being tracked; a different pair restarts the twist. */
    pair: string;
    lastAngle: number;
    rotation: number;
  } | null>(null);

  const setRefs = useCallback(
    (node: SVGSVGElement | null) => {
      localRef.current = node;
      if (svgRef) svgRef.current = node;
    },
    [svgRef],
  );

  const isLetters = scene.mode === 'letters';
  const interactive = Boolean(onMoveFlower);

  const limit = visibleCount ?? scene.flowers.length;
  // Keep the original index: it is the identity the drag handlers and the
  // reducer use, and sorting for paint order must not disturb it.
  const indexed = scene.flowers
    .map((flower, index) => ({ flower, index }))
    .filter((entry) => entry.index < limit)
    .sort((a, b) => a.flower.y - b.flower.y);
  const variants = variantsFor(scene.flowers);

  const handlePointerDown = useCallback(
    (index: number) => (event: ReactPointerEvent<SVGGElement>) => {
      if (!onMoveFlower) return;
      event.preventDefault();
      // A second finger landing on another flower is part of a twist, not a
      // new drag: leave the flower under the first finger in charge.
      if (pointersRef.current.size > 1) return;
      event.stopPropagation();
      draggingRef.current = index;
      onSelect?.(index);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [onMoveFlower, onSelect],
  );

  // Track R for the whole page while the canvas is interactive. Releasing it,
  // or the window losing focus mid-gesture, ends the rotation as one step.
  useEffect(() => {
    if (!onRotateFlower) return;
    const isR = (event: KeyboardEvent) => event.key === 'r' || event.key === 'R';
    const finish = () => {
      rHeldRef.current = false;
      setRHeld(false);
      if (rotateRef.current) {
        rotateRef.current = null;
        onMoveEnd?.();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isR(event) || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTyping(event.target)) return;
      rHeldRef.current = true;
      setRHeld(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (isR(event)) finish();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', finish);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', finish);
    };
  }, [onRotateFlower, onMoveEnd]);

  /**
   * One handler for the whole canvas. Pointer capture retargets a drag to the
   * flower's group, and the event bubbles up here, so dragging and rotating
   * both arrive through this one path.
   */
  /** Recorded in the capture phase, so it sees pointers that land on flowers too. */
  const trackPointerDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    // A primary pointer starts a fresh gesture: forget any pointer whose
    // release we never saw (iOS can swallow it when a system gesture cuts in).
    if (event.isPrimary) pointersRef.current.clear();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }, []);

  const trackPointerUp = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      pointersRef.current.delete(event.pointerId);
      if (twistRef.current && pointersRef.current.size < 2) {
        twistRef.current = null;
        onMoveEnd?.();
      }
    },
    [onMoveEnd],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const target = draggingRef.current ?? selectedIndex;
      const pointers = pointersRef.current;
      if (pointers.has(event.pointerId)) {
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }

      // Two fingers down: twist the flower by however far the line between
      // them turned since the last move. Incremental rather than measured from
      // a start angle, so a bad first sample can never cause a jump, and the
      // angle can wrap past 180 degrees without a flip.
      if (pointers.size >= 2 && onRotateFlower && target !== null) {
        const flower = scene.flowers[target];
        const [[idA, a], [idB, b]] = [...pointers.entries()] as [
          [number, { x: number; y: number }],
          [number, { x: number; y: number }],
        ];
        if (!flower || !a || !b) return;
        const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        const pair = `${idA}:${idB}`;
        const twist = twistRef.current;
        if (!twist || twist.index !== target || twist.pair !== pair) {
          twistRef.current = {
            index: target,
            pair,
            lastAngle: angle,
            rotation: flower.rotation,
          };
          return;
        }
        const step = ((((angle - twist.lastAngle + 180) % 360) + 360) % 360) - 180;
        twist.lastAngle = angle;
        twist.rotation += step;
        onRotateFlower(target, twist.rotation);
        return;
      }

      if (rHeldRef.current && onRotateFlower && target !== null) {
        const flower = scene.flowers[target];
        if (!flower) return;
        const gesture = rotateRef.current;
        if (!gesture || gesture.index !== target) {
          rotateRef.current = {
            index: target,
            startX: event.clientX,
            startRotation: flower.rotation,
          };
          return;
        }
        onRotateFlower(
          target,
          gesture.startRotation + (event.clientX - gesture.startX) * ROTATE_DEGREES_PER_PX,
        );
        return;
      }

      const index = draggingRef.current;
      const svg = localRef.current;
      if (index === null || !svg || !onMoveFlower) return;
      const point = toCanvasPoint(svg, event.clientX, event.clientY);
      if (point) onMoveFlower(index, point.x, point.y);
    },
    [onMoveFlower, onRotateFlower, selectedIndex, scene.flowers],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      if (draggingRef.current === null) return;
      draggingRef.current = null;
      // A rotation made during the drag is committed with it; holding R
      // afterwards starts a fresh rotate gesture on the selected flower.
      rotateRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      onMoveEnd?.();
    },
    [onMoveEnd],
  );

  /** Arrow keys nudge the focused bloom, so arranging works without a mouse. */
  const handleKeyDown = useCallback(
    (index: number, flower: FlowerPlacement) => (event: ReactKeyboardEvent<SVGGElement>) => {
      if (!onMoveFlower) return;
      const step = event.shiftKey ? 5 : 1.5;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = moves[event.key];
      if (!delta) return;
      event.preventDefault();
      onMoveFlower(index, flower.x + delta[0], flower.y + delta[1]);
      onMoveEnd?.();
    },
    [onMoveFlower, onMoveEnd],
  );

  return (
    <svg
      ref={setRefs}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title}
      strokeLinejoin="round"
      strokeLinecap="round"
      style={{ touchAction: interactive ? 'none' : undefined, color: ink }}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerDownCapture={interactive ? trackPointerDown : undefined}
      onPointerUpCapture={interactive ? trackPointerUp : undefined}
      onPointerCancelCapture={interactive ? trackPointerUp : undefined}
    >
      {ground && <rect width="100" height="100" fill={paper} />}

      {!sealed && !isLetters && (
        <g aria-hidden="true">
          {indexed.map(({ flower, index }) => (
            <path
              key={`stem-${index}`}
              d={`M${flower.x} ${flower.y} Q${(flower.x + BINDING_POINT.x) / 2} ${
                (flower.y + BINDING_POINT.y) / 2 + 2
              } ${BINDING_POINT.x} ${BINDING_POINT.y}`}
              fill="none"
              stroke={scene.mono ? 'currentColor' : STEM_COLOR}
              strokeWidth={1.3}
            />
          ))}
        </g>
      )}

      {!sealed && !isLetters && (
        <Greenery
          kind={scene.greenery}
          flowers={indexed.map((entry) => entry.flower)}
          bloomSize={BLOOM_SIZE}
          mono={scene.mono}
          paper={paper}
        />
      )}

      {!sealed &&
        indexed.map(({ flower, index }) => {
          const info = FLOWERS[flower.type];
          const Art = info.art;
          const size = (isLetters ? LETTER_BLOOM_SIZE : BLOOM_SIZE) * flower.scale;
          const selected = selectedIndex === index;

          return (
            <g
              key={index}
              transform={`translate(${flower.x} ${flower.y}) rotate(${flower.rotation}) scale(${
                size / 100
              }) translate(-50 -50)`}
              onPointerDown={interactive ? handlePointerDown(index) : undefined}
              onPointerUp={interactive ? endDrag : undefined}
              onPointerCancel={interactive ? endDrag : undefined}
              onKeyDown={interactive ? handleKeyDown(index, flower) : undefined}
              tabIndex={interactive ? 0 : undefined}
              role={interactive ? 'button' : undefined}
              aria-label={
                interactive
                  ? `${info.name}, position ${Math.round(flower.x)} across, ${Math.round(
                      flower.y,
                    )} down. Use the arrow keys to move it.`
                  : undefined
              }
              style={{ cursor: interactive ? (rHeld ? 'ew-resize' : 'grab') : undefined }}
            >
              {selected && (
                <circle
                  cx={50}
                  cy={50}
                  r={54}
                  fill="none"
                  stroke={ink}
                  strokeWidth={4}
                  strokeDasharray="10 8"
                  opacity={0.9}
                />
              )}
              <Art
                color={flower.color}
                mono={scene.mono}
                paper={paper}
                variant={variants[index]}
              />
            </g>
          );
        })}

      {(!isLetters || sealed) && (
        <>
          <WrapPaper style={scene.wrap} mono={scene.mono} paper={paper} sealed={sealed} />
          <Ribbon color={scene.ribbon} mono={scene.mono} paper={paper} />
        </>
      )}
    </svg>
  );
}
