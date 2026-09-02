#!/usr/bin/env python3
"""Measuring tape for the art pack.

Every placement number in `src/config/experience.ts` was derived with this, and
every one of them can be re-derived with it. That matters more than the numbers
themselves: the supplied `asset-manifest.json` is wrong in several places, so
anyone who "corrects" our values back to the manifest's without re-measuring
will silently break the composition.

Usage:

    python3 tools/measure.py sheets                 # dimensions + alpha, vs the manifest
    python3 tools/measure.py frames <sheet>         # per-frame character bounds
    python3 tools/measure.py wheels                 # wheel centres and diameter
    python3 tools/measure.py window                 # what the side window samples
    python3 tools/measure.py conceal                # does the cover hide the car
    python3 tools/measure.py seams                  # do the parallax plates tile
    python3 tools/measure.py all

`<sheet>` is a manifest sprite-sheet key, e.g. `pandaRevealCheer`.
"""
import json
import os
import sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pngtool import readpng

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = os.path.join(ROOT, 'Assets')
ALPHA = 30


def manifest():
    with open(os.path.join(PACK, 'asset-manifest.json'), encoding='utf-8') as fh:
        return json.load(fh)


def load(rel):
    return readpng(os.path.join(PACK, rel))


def alpha_at(px, channels, width, x, y):
    if channels < 4:
        return 255
    return px[(y * width + x) * 4 + 3]


def cell_origin(index, columns, cell_w, cell_h):
    return (index % columns) * cell_w, (index // columns) * cell_h


def bbox(px, channels, width, ox, oy, cw, ch, threshold=ALPHA):
    """Tight alpha bounds of one cell, in cell-local coordinates."""
    x0, y0, x1, y1 = cw, ch, -1, -1
    for y in range(ch):
        row = (oy + y) * width
        for x in range(cw):
            if channels < 4 or px[(row + ox + x) * 4 + 3] > threshold:
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    if x1 < 0:
        return None
    return x0, y0, x1, y1


# ---------------------------------------------------------------- commands

def cmd_sheets():
    """Every image against what the manifest claims about it."""
    m = manifest()
    print('%-34s %-11s %-11s %-6s %s' % ('FILE', 'ACTUAL', 'MANIFEST', 'ALPHA', 'STATUS'))
    entries = []
    for name, sheet in m['spriteSheets'].items():
        entries.append((name, sheet['src'], sheet['size'], True))
    for name, bg in m['backgrounds'].items():
        entries.append((name, bg['src'], bg['size'], not bg['opaque']))
    for name, ov in m['overlays'].items():
        entries.append((name, ov['src'], ov['size'], not ov['opaque']))

    problems = 0
    for name, src, declared, wants_alpha in entries:
        w, h, channels, px = load(src)
        has_alpha = channels == 4
        size_ok = [w, h] == list(declared)
        alpha_ok = has_alpha == wants_alpha
        status = 'ok' if size_ok and alpha_ok else 'MISMATCH'
        if status != 'ok':
            problems += 1
        print('%-34s %-11s %-11s %-6s %s' % (
            os.path.basename(src)[:34],
            '%dx%d' % (w, h),
            '%dx%d' % tuple(declared),
            'yes' if has_alpha else 'no',
            status,
        ))
    print('\n%s' % ('all files agree with the manifest' if not problems
                    else '%d file(s) disagree with the manifest' % problems))
    return problems


def cmd_frames(sheet_name):
    """Character bounds per frame — what a placement rect actually renders.

    A rect sized to the character renders it too small whenever the character
    does not fill its cell, which is true of every mascot sheet here.
    """
    m = manifest()
    sheet = m['spriteSheets'].get(sheet_name)
    if not sheet:
        print('Unknown sheet "%s". Try: %s' % (sheet_name, ', '.join(m['spriteSheets'])))
        return 1
    w, h, channels, px = load(sheet['src'])
    columns, _ = sheet['grid']
    cw, ch = sheet['cell']
    print('%s  cell %dx%d  grid %dx%d' % (sheet_name, cw, ch, *sheet['grid']))
    print('%-3s %-24s %-19s %-13s %s' % ('#', 'FRAME', 'BBOX (cell-local)', 'SIZE', 'FILL w/h'))
    for i, frame_name in enumerate(sheet['frames']):
        ox, oy = cell_origin(i, columns, cw, ch)
        box = bbox(px, channels, w, ox, oy, cw, ch)
        if not box:
            print('%-3d %-24s (empty)' % (i, frame_name))
            continue
        x0, y0, x1, y1 = box
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        print('%-3d %-24s x %3d..%3d y %3d..%3d  %4dx%-4d  %.2f / %.2f' % (
            i, frame_name, x0, x1, y0, y1, bw, bh, bw / cw, bh / ch))
    print('\nTo render a character N px tall, draw the cell at width'
          '\n  N / (bbox_h / cell_h) * (cell_w / cell_h)')
    return 0


def cmd_wheels():
    """Wheel centres and diameter, from the art rather than the manifest."""
    m = manifest()
    sheet = m['spriteSheets']['silverLiftback']
    w, h, channels, px = load(sheet['src'])
    columns, _ = sheet['grid']
    cw, ch = sheet['cell']

    complete = cell_origin(1, columns, cw, ch)   # driving-side-complete
    body = cell_origin(3, columns, cw, ch)       # driving-side-body-no-wheels

    def bottom_edge(origin, x):
        ox, oy = origin
        ys = [y for y in range(ch) if px[((oy + y) * w + ox + x) * 4 + 3] > 40]
        return max(ys) if ys else None

    sill = max(filter(None, (bottom_edge(body, x) for x in range(200, 320))))
    print('body sill (between the arches): y=%d' % sill)

    results = {}
    for label, lo, hi in (('front', 40, 180), ('rear', 340, 470)):
        cols = [(x, bottom_edge(complete, x)) for x in range(lo, hi)]
        tyre = [(x, y) for x, y in cols if y and y > sill - 10]
        if not tyre:
            print('%s: not found' % label)
            continue
        x0, x1 = tyre[0][0], tyre[-1][0]
        ground = max(y for _, y in tyre)
        diameter = x1 - x0 + 1
        centre = ((x0 + x1) / 2, ground - diameter / 2)
        apex = min(filter(None, (bottom_edge(body, x) for x in range(x0, x1 + 1))))
        results[label] = (centre, diameter)
        print('%s tyre: x %d..%d (d=%d), touches road at y=%d, arch apex y=%d'
              % (label, x0, x1, diameter, ground, apex))
        print('   centre = (%.0f, %.0f)' % centre)

    # the wheel sprite does not fill its cell, so scale the destination up
    ox, oy = cell_origin(4, columns, cw, ch)
    box = bbox(px, channels, w, ox, oy, cw, ch, 40)
    art_w = box[2] - box[0] + 1
    print('\nwheel sprite art occupies %d of its %d-px cell (%.3f)' % (art_w, cw, art_w / cw))
    for label, (centre, diameter) in results.items():
        dest = diameter * cw / art_w
        print('   %-5s destination rect = [%.0f, %.0f, %.0f, %.0f]'
              % (label, centre[0] - dest / 2, centre[1] - dest / 2, dest, dest))
    return 0


def cmd_window():
    """What the side-window mask samples from the driver sheet."""
    m = manifest()
    car = m['spriteSheets']['silverLiftback']
    driver = m['spriteSheets']['womanDriver']

    mw, mh, mch, mpx = load(m['overlays']['sideWindowDriverClip']['src'])
    xs = [x for x in range(mw) for y in range(mh) if mpx[(y * mw + x) * 4 + 3] > 8]
    ys = [y for y in range(mh) for x in range(mw) if mpx[(y * mw + x) * 4 + 3] > 8]
    win = (min(xs), min(ys), max(xs), max(ys))
    print('window mask opaque region: x %d..%d  y %d..%d  (%dx%d)'
          % (win[0], win[2], win[1], win[3], win[2] - win[0] + 1, win[3] - win[1] + 1))

    dw, dh, dch, dpx = load(driver['src'])
    cw, ch = driver['cell']
    box = bbox(dpx, dch, dw, 0, 0, cw, ch)
    print('driver character bbox in cell: x %d..%d y %d..%d' % (box[0], box[2], box[1], box[3]))

    navy = [(x, y) for y in range(ch) for x in range(cw)
            if dpx[(y * dw + x) * 4 + 3] > 200
            and dpx[(y * dw + x) * 4 + 2] > dpx[(y * dw + x) * 4] + 18
            and 40 < dpx[(y * dw + x) * 4 + 2] < 150]
    if navy:
        print('navy uniform starts at cell-y %d' % min(y for _, y in navy))

    print('\nwhat each candidate driver rect makes the window sample:')
    for label, rect in (
        ('manifest', car['drivingAssembly']['driverFrameRect']),
        ('ours', [152, 177, 198, 198]),
    ):
        rx, ry, rw, rh = rect
        top = (win[1] - ry) / rh * ch
        bot = (win[3] - ry) / rh * ch
        left = (win[0] - rx) / rw * cw
        right = (win[2] - rx) / rw * cw
        print('  %-9s %-22s -> cell-y %.0f..%.0f, cell-x %.0f..%.0f'
              % (label, str(rect), top, bot, left, right))
    print('\nThe uniform must fall inside the sampled y range or the glass shows only hair.')
    return 0


def cmd_conceal():
    """Does cover frame 0 hide reveal car frame 0 completely?"""
    m = manifest()
    car = m['spriteSheets']['silverLiftback']
    cover = m['spriteSheets']['redCoverReveal']
    cw_, ch_ = car['cell']

    aw, ah, ach, apx = load(car['src'])
    bw, bh, bch, bpx = load(cover['src'])
    cx, cy = cell_origin(0, car['grid'][0], cw_, ch_)
    vx, vy = cell_origin(0, cover['grid'][0], *cover['cell'])

    car_px = leaked = 0
    for y in range(ch_):
        for x in range(cw_):
            if apx[((cy + y) * aw + cx + x) * 4 + 3] > 24:
                car_px += 1
                if bpx[((vy + y) * bw + vx + x) * 4 + 3] < 200:
                    leaked += 1
    print('car frame 0 opaque pixels: %d' % car_px)
    print('not covered by fully-opaque cloth: %d (%.2f%%)' % (leaked, 100 * leaked / car_px))
    print('\n%s' % ('The cover hides the car completely.' if leaked == 0 else
                    'A thin edge fringe would show, so the opening does not draw the car at all.'))
    return 0


def cmd_seams():
    """Do the repeating plates tile edge to edge?"""
    m = manifest()
    print('%-36s %-10s %-6s %s' % ('LAYER', 'MEAN DIFF', 'MAX', 'TILES CLEANLY'))
    for name, bg in m['backgrounds'].items():
        if not bg.get('repeatX'):
            continue
        w, h, channels, px = load(bg['src'])
        total = worst = samples = 0
        for y in range(0, h, 5):
            left = [px[(y * w + 0) * channels + c] for c in range(channels)]
            right = [px[(y * w + w - 1) * channels + c] for c in range(channels)]
            d = max(abs(left[c] - right[c]) for c in range(channels))
            total += d
            worst = max(worst, d)
            samples += 1
        mean = total / samples
        print('%-36s %-10.1f %-6d %s' % (name, mean, worst, 'yes' if worst < 12 else 'NO'))
    print('\nAny "NO" needs mirrored tiling (see ParallaxController.isMirroredTile);'
          '\nbutting copies together would leave a visible vertical seam.')
    return 0


COMMANDS = {
    'sheets': cmd_sheets,
    'wheels': cmd_wheels,
    'window': cmd_window,
    'conceal': cmd_conceal,
    'seams': cmd_seams,
}


def main(argv):
    if len(argv) < 2 or argv[1] in ('-h', '--help'):
        print(__doc__)
        return 0
    command = argv[1]
    if command == 'frames':
        if len(argv) < 3:
            print('usage: measure.py frames <sheetName>')
            return 1
        return cmd_frames(argv[2])
    if command == 'all':
        for name, fn in COMMANDS.items():
            print('\n' + '=' * 66)
            print('== %s' % name)
            print('=' * 66)
            fn()
        return 0
    if command in COMMANDS:
        return COMMANDS[command]()
    print('Unknown command "%s". Try: %s, frames, all' % (command, ', '.join(COMMANDS)))
    return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
