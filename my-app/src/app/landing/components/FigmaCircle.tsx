"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FigmaCircleProps = {
  /** Base exported container/frame from Figma (often includes shadows/extra effects). */
  frameSrc?: string;
  /** Stroke/overlay ellipse exported from Figma. */
  strokeSrc?: string;
  /** Alpha mask image exported from Figma (ellipse mask). */
  maskSrc: string;
  /** Photo/content image to show inside the mask. */
  photoSrc: string;

  /** Final rendered size for desktop (px). */
  sizePx: number;
  /** Optional max width for responsive layouts. */
  maxWidth?: string;

  /** Mask alignment copied 1:1 from Figma reference code. */
  maskPosition: string;
  /** Mask size copied 1:1 from Figma reference code. */
  maskSize: string;
  /** Optional extra line overlay (e.g. the vertical line under some circles). */
  line?: {
    src: string;
    widthPx: number;
    heightPx: number;
    leftPx: number;
    topPx: number;
    rotateDeg?: number;
  };
};

function parsePxPair(value: string) {
  const m = value.trim().match(/^(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px$/);
  if (!m) return null;
  return { x: Number(m[1]), y: Number(m[2]) };
}

export function FigmaCircle({
  frameSrc,
  strokeSrc,
  maskSrc,
  photoSrc,
  sizePx,
  maxWidth = "100%",
  maskPosition,
  maskSize,
  line,
}: FigmaCircleProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [renderSize, setRenderSize] = useState<number | null>(null);

  const basePos = useMemo(() => parsePxPair(maskPosition), [maskPosition]);
  const baseSize = useMemo(() => parsePxPair(maskSize), [maskSize]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const w = entry?.contentRect?.width ?? el.getBoundingClientRect().width;
      if (w > 0) setRenderSize(w);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = renderSize ? renderSize / sizePx : 1;
  const scaledMaskPos =
    basePos && Number.isFinite(scale) ? `${basePos.x * scale}px ${basePos.y * scale}px` : maskPosition;
  const scaledMaskSize =
    baseSize && Number.isFinite(scale) ? `${baseSize.x * scale}px ${baseSize.y * scale}px` : maskSize;

  const scaledLine =
    line && Number.isFinite(scale)
      ? {
          ...line,
          widthPx: line.widthPx * scale,
          heightPx: line.heightPx * scale,
          leftPx: line.leftPx * scale,
          topPx: line.topPx * scale,
        }
      : line;

  return (
    <div
      className="figmaCircle"
      ref={rootRef}
      style={
        {
          ["--fc-size" as never]: `${sizePx}px`,
          ["--fc-max" as never]: maxWidth,
        } as never
      }
      aria-hidden="true"
    >
      {frameSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="figmaCircle__frame" src={frameSrc} alt="" />
      ) : null}

      <div
        className="figmaCircle__masked"
        style={
          {
            ["--fc-mask" as never]: `url(${maskSrc})`,
            ["--fc-mask-pos" as never]: scaledMaskPos,
            ["--fc-mask-size" as never]: scaledMaskSize,
          } as never
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="figmaCircle__photo" src={photoSrc} alt="" />
      </div>

      {strokeSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="figmaCircle__stroke" src={strokeSrc} alt="" />
      ) : null}

      {scaledLine ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="figmaCircle__line"
          src={scaledLine.src}
          alt=""
          style={
            {
              ["--fc-line-w" as never]: `${scaledLine.widthPx}px`,
              ["--fc-line-h" as never]: `${scaledLine.heightPx}px`,
              ["--fc-line-left" as never]: `${scaledLine.leftPx}px`,
              ["--fc-line-top" as never]: `${scaledLine.topPx}px`,
              ["--fc-line-rot" as never]: `${scaledLine.rotateDeg ?? 0}deg`,
            } as never
          }
        />
      ) : null}
    </div>
  );
}

