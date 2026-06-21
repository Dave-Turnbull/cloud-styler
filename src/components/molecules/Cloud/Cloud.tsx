import { forwardRef } from 'react';
import type { CloudSettings } from '../../../utils/types';
import type { Ellipse } from '../../../utils/puffs';
import { mixWhite, GRADIENT_STOPS } from '../../../utils/colour';

interface CloudProps {
  settings: CloudSettings;
  puffs: Ellipse[];
}

/*
 * Filter params scale by density so the look stays proportional:
 *   volume/vSoft     stdDeviation = fuzzy / n
 *   fuzz/displace    scale        = rand  / n
 *   backfill/erode   radius       = inset / n
 */
export const Cloud = forwardRef<SVGSVGElement, CloudProps>(
  ({ settings, puffs }, ref) => {
    const n = settings.dens;

    // Whole-cloud transform: flips fold into the scale sign.
    const sx = (settings.flipX ? -1 : 1) * settings.scale;
    const sy = (settings.flipY ? -1 : 1) * settings.scale;
    const transform = `rotate(${settings.rotate}deg) scale(${sx}, ${sy})`;

    // Tight viewBox derived from actual puff geometry so the copied SVG has no
    // excess whitespace. Padding mirrors the filter region declarations:
    // the outer fuzz filter uses x="-15%" y="-30%" which is the widest extent
    // that can be rendered; the inner filters (backfill/volume) are wider but
    // clipped inside the group before fuzz runs.
    const bbox = puffs.reduce(
      (acc, p) => ({
        x0: Math.min(acc.x0, p.cx - p.rx),
        y0: Math.min(acc.y0, p.cy - p.ry),
        x1: Math.max(acc.x1, p.cx + p.rx),
        y1: Math.max(acc.y1, p.cy + p.ry),
      }),
      { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
    );
    const pw = bbox.x1 - bbox.x0;
    const ph = bbox.y1 - bbox.y0;
    const padX = pw * 0.15 + settings.rand / n;
    const padY = ph * 0.30 + settings.rand / n;
    const viewBox = `${(bbox.x0 - padX).toFixed(1)} ${(bbox.y0 - padY).toFixed(1)} ${(pw + padX * 2).toFixed(1)} ${(ph + padY * 2).toFixed(1)}`;

    return (
      <svg
        ref={ref}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Adjustable cloud"
        style={{ transform, transformOrigin: 'center', opacity: settings.opacity }}
      >
        <defs>
          <radialGradient
            id="gPuff"
            cx={settings.angX}
            cy={settings.angY}
            r={settings.angR}
          >
            {GRADIENT_STOPS.map((s, i) => (
              <stop
                key={i}
                offset={s.offset}
                stopColor={mixWhite(settings.col, s.t)}
              />
            ))}
          </radialGradient>

          <filter id="fuzz" x="-15%" y="-30%" width="130%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.10"
              numOctaves={3}
              seed={11}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={settings.rand / n}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          <filter id="backfill" x="-25%" y="-35%" width="150%" height="170%">
            <feGaussianBlur in="SourceAlpha" stdDeviation={2} result="ba" />
            <feComponentTransfer in="ba" result="mask">
              <feFuncA type="linear" slope={10} intercept={-2.5} />
            </feComponentTransfer>
            <feMorphology
              in="mask"
              operator="erode"
              radius={settings.inset / n}
              result="ins"
            />
            <feFlood floodColor="#eef3f9" result="col" />
            <feComposite in="col" in2="ins" operator="in" />
          </filter>

          <filter id="volume" x="-25%" y="-35%" width="150%" height="170%">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={settings.fuzzy / n}
              result="soft"
            />

            {/* underside shadow band */}
            <feGaussianBlur
              in="SourceAlpha"
              stdDeviation={settings.shSize}
              result="smS"
            />
            <feOffset
              in="smS"
              dx={settings.shX}
              dy={settings.shY}
              result="smSup"
            />
            <feComposite in="smS" in2="smSup" operator="out" result="band" />
            <feComposite
              in="band"
              in2="SourceAlpha"
              operator="in"
              result="bandClip"
            />
            <feFlood
              floodColor={settings.shCol}
              floodOpacity={settings.shOp}
              result="shc"
            />
            <feComposite
              in="shc"
              in2="bandClip"
              operator="in"
              result="shadow"
            />

            {/* top highlight band */}
            <feGaussianBlur
              in="SourceAlpha"
              stdDeviation={settings.hiSize}
              result="smH"
            />
            <feOffset
              in="smH"
              dx={settings.hiX}
              dy={settings.hiY}
              result="smHdn"
            />
            <feComposite in="smH" in2="smHdn" operator="out" result="hband" />
            <feComposite
              in="hband"
              in2="SourceAlpha"
              operator="in"
              result="hbandClip"
            />
            <feFlood
              floodColor={settings.hiCol}
              floodOpacity={settings.hiOp}
              result="hic"
            />
            <feComposite in="hic" in2="hbandClip" operator="in" result="hi" />

            <feMerge>
              <feMergeNode in="soft" />
              <feMergeNode in="shadow" />
              <feMergeNode in="hi" />
            </feMerge>
          </filter>

          <g id="puffs">
            {puffs.map((p, i) => (
              <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} />
            ))}
          </g>
        </defs>

        <g filter="url(#fuzz)">
          <use href="#puffs" fill="url(#gPuff)" filter="url(#backfill)" />
          <use href="#puffs" fill="url(#gPuff)" filter="url(#volume)" />
        </g>
      </svg>
    );
  },
);

Cloud.displayName = 'Cloud';
