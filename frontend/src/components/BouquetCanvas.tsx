/**
 * The bouquet itself: one square SVG that every surface reuses.
 *
 * The builder, the recipient page, the share preview and the PNG export all
 * render this same component, which is the only way the thing the sender
 * arranges is guaranteed to be the thing the recipient opens.
 *
 * Layer order, back to front: greenery, stems, blooms, sleeve, ribbon. Blooms
 * are sorted by their y position so lower flowers overlap higher ones, which
 * matches the server-side painter in `backend/app/og_render.py`.
 */

import {
  useCallback,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type RefObject,
} from 'react';
import type { BouquetMode, FlowerPlacement, GreeneryType, WrapStyle } from '../types/bouquet';
import { FLOWERS } from './flowers';
import Greenery from './greenery/Greenery';
import WrapPaper, { Ribbon } from './wraps/WrapPaper';
import { BINDING_POINT } from '../lib/arrange';

const STEM_COLOR = '#6d8c63';

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
   * the serialised copy used by the PNG export still draws its lines.
   */
  ink: string;
  /** Draw only the wrapped sleeve, for a bouquet that has not been opened. */
  sealed?: boolean;
  /** Show only the first N blooms. Drives the one-by-one reveal. */
  visibleCount?: number;
  /** Enables dragging. Receives canvas-space coordinates (0-100). */
  onMoveFlower?: (index: number, x: number, y: number) => void;
  /** Called once a drag gesture finishes, so history can record one step. */
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
  visibleCount,
  onMoveFlower,
  onMoveEnd,
  selectedIndex = null,
  onSelect,
  svgRef,
  className,
  title,
}: BouquetCanvasProps): ReactElement {
  const localRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef<number | null>(null);

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

  const handlePointerDown = useCallback(
    (index: number) => (event: ReactPointerEvent<SVGGElement>) => {
      if (!onMoveFlower) return;
      event.preventDefault();
      event.stopPropagation();
      draggingRef.current = index;
      onSelect?.(index);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [onMoveFlower, onSelect],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      const index = draggingRef.current;
      const svg = localRef.current;
      if (index === null || !svg || !onMoveFlower) return;
      const point = toCanvasPoint(svg, event.clientX, event.clientY);
      if (point) onMoveFlower(index, point.x, point.y);
    },
    [onMoveFlower],
  );

  const endDrag = useCallback(
    (event: ReactPointerEvent<SVGGElement>) => {
      if (draggingRef.current === null) return;
      draggingRef.current = null;
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
    >
      {/* An opaque ground so the exported PNG is never transparent. */}
      <rect width="100" height="100" fill={paper} />

      {!sealed && !isLetters && (
        <Greenery kind={scene.greenery} mono={scene.mono} paper={paper} />
      )}

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
              onPointerMove={interactive ? handlePointerMove : undefined}
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
              style={{ cursor: interactive ? 'grab' : undefined }}
            >
              {selected && (
                <circle
                  cx={50}
                  cy={50}
                  r={54}
                  fill="none"
                  stroke="#cf6382"
                  strokeWidth={4}
                  strokeDasharray="10 8"
                  opacity={0.9}
                />
              )}
              <Art color={flower.color} mono={scene.mono} paper={paper} />
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
