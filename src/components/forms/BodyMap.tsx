import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
// Silhouette back from project folder (Silhoette back.svg) – embedded so it always renders
import bodyBackSvg from '@/assets/body-map/body-back.svg?raw';

export interface BodyMapMarker {
  id: string;
  x?: number;
  y?: number;
  side: 'front' | 'back';
  notes?: string;
  timestamp: string;
  bodyPart?: string;
  bodyPartSide?: 'left' | 'right';
  intensity?: number;
}

interface BodyMapProps {
  markers: BodyMapMarker[];
  onMarkersChange: (markers: BodyMapMarker[]) => void;
  maxMarkers?: number;
  disabled?: boolean;
  /** When true, show front and back side-by-side (read-only). Use in practitioner form view. */
  sideBySide?: boolean;
  className?: string;
}

// Body part definitions with SVG paths - anatomically accurate
const BODY_PARTS_FRONT = [
  { id: 'head', name: 'Head', path: 'M 100 5 C 120 5 135 20 135 45 C 135 70 120 85 100 85 C 80 85 65 70 65 45 C 65 20 80 5 100 5' },
  { id: 'neck', name: 'Neck', path: 'M 85 85 L 85 100 L 115 100 L 115 85' },
  { id: 'left-shoulder', name: 'Left Shoulder', side: 'left' as const, path: 'M 55 100 Q 40 100 30 115 L 55 115 L 65 100 Z' },
  { id: 'right-shoulder', name: 'Right Shoulder', side: 'right' as const, path: 'M 145 100 Q 160 100 170 115 L 145 115 L 135 100 Z' },
  { id: 'chest', name: 'Chest', path: 'M 65 100 L 65 150 L 135 150 L 135 100 Z' },
  { id: 'left-arm-upper', name: 'Left Upper Arm', side: 'left' as const, path: 'M 30 115 L 20 180 L 40 180 L 55 115 Z' },
  { id: 'right-arm-upper', name: 'Right Upper Arm', side: 'right' as const, path: 'M 170 115 L 180 180 L 160 180 L 145 115 Z' },
  { id: 'left-elbow', name: 'Left Elbow', side: 'left' as const, path: 'M 20 180 C 15 190 15 200 20 210 L 40 210 C 45 200 45 190 40 180 Z' },
  { id: 'right-elbow', name: 'Right Elbow', side: 'right' as const, path: 'M 180 180 C 185 190 185 200 180 210 L 160 210 C 155 200 155 190 160 180 Z' },
  { id: 'left-forearm', name: 'Left Forearm', side: 'left' as const, path: 'M 20 210 L 15 270 L 35 270 L 40 210 Z' },
  { id: 'right-forearm', name: 'Right Forearm', side: 'right' as const, path: 'M 180 210 L 185 270 L 165 270 L 160 210 Z' },
  { id: 'left-hand', name: 'Left Hand', side: 'left' as const, path: 'M 15 270 L 10 300 L 40 300 L 35 270 Z' },
  { id: 'right-hand', name: 'Right Hand', side: 'right' as const, path: 'M 185 270 L 190 300 L 160 300 L 165 270 Z' },
  { id: 'abdomen', name: 'Abdomen', path: 'M 65 150 L 65 200 L 135 200 L 135 150 Z' },
  { id: 'lower-abdomen', name: 'Lower Abdomen', path: 'M 65 200 L 65 235 L 135 235 L 135 200 Z' },
  { id: 'left-hip', name: 'Left Hip', side: 'left' as const, path: 'M 65 235 L 55 260 L 80 260 L 85 235 Z' },
  { id: 'right-hip', name: 'Right Hip', side: 'right' as const, path: 'M 135 235 L 145 260 L 120 260 L 115 235 Z' },
  { id: 'groin', name: 'Groin', path: 'M 85 235 L 80 260 L 120 260 L 115 235 Z' },
  { id: 'left-thigh', name: 'Left Thigh', side: 'left' as const, path: 'M 55 260 L 50 340 L 80 340 L 80 260 Z' },
  { id: 'right-thigh', name: 'Right Thigh', side: 'right' as const, path: 'M 145 260 L 150 340 L 120 340 L 120 260 Z' },
  { id: 'left-knee', name: 'Left Knee', side: 'left' as const, path: 'M 50 340 C 45 355 45 370 50 385 L 80 385 C 85 370 85 355 80 340 Z' },
  { id: 'right-knee', name: 'Right Knee', side: 'right' as const, path: 'M 150 340 C 155 355 155 370 150 385 L 120 385 C 115 370 115 355 120 340 Z' },
  { id: 'left-shin', name: 'Left Shin', side: 'left' as const, path: 'M 50 385 L 45 460 L 75 460 L 80 385 Z' },
  { id: 'right-shin', name: 'Right Shin', side: 'right' as const, path: 'M 150 385 L 155 460 L 125 460 L 120 385 Z' },
  { id: 'left-ankle', name: 'Left Ankle', side: 'left' as const, path: 'M 45 460 L 40 480 L 75 480 L 75 460 Z' },
  { id: 'right-ankle', name: 'Right Ankle', side: 'right' as const, path: 'M 155 460 L 160 480 L 125 480 L 125 460 Z' },
  { id: 'left-foot', name: 'Left Foot', side: 'left' as const, path: 'M 35 480 L 30 510 L 80 510 L 80 480 Z' },
  { id: 'right-foot', name: 'Right Foot', side: 'right' as const, path: 'M 165 480 L 170 510 L 120 510 L 120 480 Z' },
];

const BODY_PARTS_BACK = [
  { id: 'head', name: 'Head (Back)', path: 'M 100 5 C 120 5 135 20 135 45 C 135 70 120 85 100 85 C 80 85 65 70 65 45 C 65 20 80 5 100 5' },
  { id: 'neck-back', name: 'Neck (Back)', path: 'M 85 85 L 85 100 L 115 100 L 115 85' },
  { id: 'left-shoulder-back', name: 'Left Shoulder (Back)', side: 'left' as const, path: 'M 55 100 Q 40 100 30 115 L 55 115 L 65 100 Z' },
  { id: 'right-shoulder-back', name: 'Right Shoulder (Back)', side: 'right' as const, path: 'M 145 100 Q 160 100 170 115 L 145 115 L 135 100 Z' },
  { id: 'upper-back', name: 'Upper Back', path: 'M 65 100 L 65 140 L 135 140 L 135 100 Z' },
  { id: 'left-scapula', name: 'Left Scapula', side: 'left' as const, path: 'M 65 110 L 55 115 L 55 145 L 65 150 Z' },
  { id: 'right-scapula', name: 'Right Scapula', side: 'right' as const, path: 'M 135 110 L 145 115 L 145 145 L 135 150 Z' },
  { id: 'mid-back', name: 'Mid Back', path: 'M 65 140 L 65 180 L 135 180 L 135 140 Z' },
  { id: 'lower-back', name: 'Lower Back', path: 'M 65 180 L 65 220 L 135 220 L 135 180 Z' },
  { id: 'sacrum', name: 'Sacrum', path: 'M 80 220 L 75 250 L 125 250 L 120 220 Z' },
  { id: 'left-triceps', name: 'Left Triceps', side: 'left' as const, path: 'M 30 115 L 20 180 L 40 180 L 55 115 Z' },
  { id: 'right-triceps', name: 'Right Triceps', side: 'right' as const, path: 'M 170 115 L 180 180 L 160 180 L 145 115 Z' },
  { id: 'left-elbow-back', name: 'Left Elbow (Back)', side: 'left' as const, path: 'M 20 180 C 15 190 15 200 20 210 L 40 210 C 45 200 45 190 40 180 Z' },
  { id: 'right-elbow-back', name: 'Right Elbow (Back)', side: 'right' as const, path: 'M 180 180 C 185 190 185 200 180 210 L 160 210 C 155 200 155 190 160 180 Z' },
  { id: 'left-forearm-back', name: 'Left Forearm (Back)', side: 'left' as const, path: 'M 20 210 L 15 270 L 35 270 L 40 210 Z' },
  { id: 'right-forearm-back', name: 'Right Forearm (Back)', side: 'right' as const, path: 'M 180 210 L 185 270 L 165 270 L 160 210 Z' },
  { id: 'left-hand-back', name: 'Left Hand (Back)', side: 'left' as const, path: 'M 15 270 L 10 300 L 40 300 L 35 270 Z' },
  { id: 'right-hand-back', name: 'Right Hand (Back)', side: 'right' as const, path: 'M 185 270 L 190 300 L 160 300 L 165 270 Z' },
  { id: 'left-glute', name: 'Left Glute', side: 'left' as const, path: 'M 65 220 L 55 270 L 100 270 L 100 220 Z' },
  { id: 'right-glute', name: 'Right Glute', side: 'right' as const, path: 'M 135 220 L 145 270 L 100 270 L 100 220 Z' },
  { id: 'left-hamstring', name: 'Left Hamstring', side: 'left' as const, path: 'M 55 270 L 50 340 L 80 340 L 80 270 Z' },
  { id: 'right-hamstring', name: 'Right Hamstring', side: 'right' as const, path: 'M 145 270 L 150 340 L 120 340 L 120 270 Z' },
  { id: 'left-knee-back', name: 'Left Knee (Back)', side: 'left' as const, path: 'M 50 340 C 45 355 45 370 50 385 L 80 385 C 85 370 85 355 80 340 Z' },
  { id: 'right-knee-back', name: 'Right Knee (Back)', side: 'right' as const, path: 'M 150 340 C 155 355 155 370 150 385 L 120 385 C 115 370 115 355 120 340 Z' },
  { id: 'left-calf', name: 'Left Calf', side: 'left' as const, path: 'M 50 385 L 45 460 L 75 460 L 80 385 Z' },
  { id: 'right-calf', name: 'Right Calf', side: 'right' as const, path: 'M 150 385 L 155 460 L 125 460 L 120 385 Z' },
  { id: 'left-achilles', name: 'Left Achilles', side: 'left' as const, path: 'M 55 460 L 50 485 L 70 485 L 70 460 Z' },
  { id: 'right-achilles', name: 'Right Achilles', side: 'right' as const, path: 'M 145 460 L 150 485 L 130 485 L 130 460 Z' },
  { id: 'left-heel', name: 'Left Heel', side: 'left' as const, path: 'M 45 485 L 40 510 L 75 510 L 75 485 Z' },
  { id: 'right-heel', name: 'Right Heel', side: 'right' as const, path: 'M 155 485 L 160 510 L 125 510 L 125 485 Z' },
];

/** Renders a single body diagram (front or back) with markers - used for side-by-side view and edit view. */
function BodyDiagram({
  side,
  sideMarkers,
  bodyParts,
  interactive,
  svgRef,
  onSvgClick,
}: {
  side: 'front' | 'back';
  sideMarkers: BodyMapMarker[];
  bodyParts: typeof BODY_PARTS_FRONT;
  interactive: boolean;
  svgRef?: React.RefObject<SVGSVGElement | null>;
  onSvgClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
}) {
  const imageHref = side === 'front' ? '/body-map/body-front.svg' : `data:image/svg+xml,${encodeURIComponent(bodyBackSvg)}`;
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 520"
      className={cn('w-full h-auto', interactive && 'cursor-crosshair')}
      style={{ minHeight: '280px', maxHeight: '500px' }}
      onClick={onSvgClick}
      aria-hidden
    >
      <image href={imageHref} x="-50" y="0" width="300" height="520" preserveAspectRatio="none" aria-hidden />
      {interactive && <rect x="0" y="0" width="200" height="520" fill="transparent" pointerEvents="all" aria-hidden />}
      {sideMarkers.map((marker, idx) => {
        const hasCoords = marker.x != null && marker.y != null;
        const cx = hasCoords ? marker.x! : (() => {
          const part = bodyParts.find((p: { id: string }) => p.id === marker.bodyPart);
          if (!part) return null;
          const pathMatch = part.path.match(/M\s*([\d.]+)\s*([\d.]+)/);
          if (!pathMatch) return null;
          return parseFloat(pathMatch[1]) + 20;
        })();
        const cy = hasCoords ? marker.y! : (() => {
          const part = bodyParts.find((p: { id: string }) => p.id === marker.bodyPart);
          if (!part) return null;
          const pathMatch = part.path.match(/M\s*([\d.]+)\s*([\d.]+)/);
          if (!pathMatch) return null;
          return parseFloat(pathMatch[2]) + 20;
        })();
        if (cx == null || cy == null) return null;
        return (
          <g key={marker.id} data-marker-id={marker.id} className={cn(interactive && 'cursor-pointer')} style={{ pointerEvents: 'all' }}>
            <text
              x={cx}
              y={cy + 6}
              textAnchor="middle"
              fill="#dc2626"
              fontSize="16"
              fontWeight="800"
              stroke="#ffffff"
              strokeWidth="1.5"
              paintOrder="stroke"
              className="drop-shadow-sm"
              pointerEvents="none"
              aria-hidden
            >
              X
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const BodyMap: React.FC<BodyMapProps> = ({
  markers,
  onMarkersChange,
  maxMarkers = 5,
  disabled = false,
  sideBySide = false,
  className
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentSide, setCurrentSide] = useState<'front' | 'back'>('front');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentMarkers = markers.filter(m => m.side === currentSide);
  const bodyParts = currentSide === 'front' ? BODY_PARTS_FRONT : BODY_PARTS_BACK;
  const frontMarkers = markers.filter(m => m.side === 'front');
  const backMarkers = markers.filter(m => m.side === 'back');

  /** Click on diagram: place dot at SVG coords, or remove dot if clicking on a dot. */
  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) return;
    const target = e.target as HTMLElement;
    const markerId = target?.closest?.('[data-marker-id]')?.getAttribute('data-marker-id');
    if (markerId) {
      onMarkersChange(markers.filter(m => m.id !== markerId));
      e.stopPropagation();
      return;
    }
    const svg = svgRef.current;
    if (!svg) return;
    if (markers.length >= maxMarkers) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgPt = pt.matrixTransform(ctm.inverse());
    const x = Math.round(svgPt.x * 10) / 10;
    const y = Math.round(svgPt.y * 10) / 10;
    const newMarker: BodyMapMarker = {
      id: crypto.randomUUID(),
      x,
      y,
      side: currentSide,
      timestamp: new Date().toISOString(),
      intensity: 1
    };
    onMarkersChange([...markers, newMarker]);
  }, [disabled, markers, currentSide, maxMarkers, onMarkersChange]);


  const handleMarkerNotesChange = (markerId: string, notes: string) => {
    onMarkersChange(
      markers.map(m =>
        m.id === markerId ? { ...m, notes } : m
      )
    );
  };

  const clearAllMarkers = () => {
    onMarkersChange([]);
  };

  const clearCurrentSideMarkers = () => {
    onMarkersChange(markers.filter(m => m.side !== currentSide));
  };

  if (sideBySide) {
    return (
      <div className={cn('w-full space-y-4', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg p-2 sm:p-4 border border-border overflow-hidden">
            <p className="text-sm font-medium text-muted-foreground mb-2">Front</p>
            <BodyDiagram
              side="front"
              sideMarkers={frontMarkers}
              bodyParts={BODY_PARTS_FRONT}
              interactive={false}
            />
          </div>
          <div className="bg-muted/30 rounded-lg p-2 sm:p-4 border border-border overflow-hidden">
            <p className="text-sm font-medium text-muted-foreground mb-2">Back</p>
            <BodyDiagram
              side="back"
              sideMarkers={backMarkers}
              bodyParts={BODY_PARTS_BACK}
              interactive={false}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={currentSide === 'front' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentSide('front')}
              disabled={disabled}
              className="min-h-[44px] sm:min-h-0 flex-1 sm:flex-initial"
            >
              Front
            </Button>
            <Button
              type="button"
              variant={currentSide === 'back' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentSide('back')}
              disabled={disabled}
              className="min-h-[44px] sm:min-h-0 flex-1 sm:flex-initial"
            >
              Back
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <span className="text-sm text-muted-foreground text-center sm:text-left py-2 sm:py-0">
              {markers.length} / {maxMarkers} markers
            </span>
            <div className="flex gap-2">
              {currentMarkers.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCurrentSideMarkers}
                  disabled={disabled}
                  className="min-h-[44px] sm:h-8 flex-1 sm:flex-initial text-xs"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Clear {currentSide}</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              )}
              {markers.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllMarkers}
                  disabled={disabled}
                  className="min-h-[44px] sm:h-8 flex-1 sm:flex-initial text-xs"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Body diagram: outsourced image only (no React-drawn body). Replace files in public/body-map/ with your own SVGs. */}
        <div className="relative w-full bg-muted/30 rounded-lg p-2 sm:p-4 border border-border overflow-hidden">
          <BodyDiagram
            side={currentSide}
            sideMarkers={currentMarkers}
            bodyParts={bodyParts}
            interactive={!disabled}
            svgRef={svgRef}
            onSvgClick={handleSvgClick}
          />
        </div>

        {/* Recorded points: X/Y in SVG space, remove single, Clear All */}
        {currentMarkers.length > 0 && (
          <div className="space-y-3 sm:space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm sm:text-base font-medium">Recorded points ({currentSide})</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onMarkersChange(markers.filter(m => m.side !== currentSide))}
                disabled={disabled}
                className="shrink-0"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
            <ul className="space-y-2">
              {currentMarkers.map((marker, index) => (
                <li key={marker.id} className="p-2 bg-muted/50 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkersChange(markers.filter(m => m.id !== marker.id))}
                      disabled={disabled}
                      className="ml-auto h-8 w-8 p-0 shrink-0"
                      aria-label="Remove point"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <input
                    type="text"
                    value={marker.notes || ''}
                    onChange={(e) => handleMarkerNotesChange(marker.id, e.target.value)}
                    placeholder="Optional note"
                    disabled={disabled}
                    className="w-full px-2 py-1 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
  );
};
