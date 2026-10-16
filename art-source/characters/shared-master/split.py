"""Fixed-coordinate masks for the existing dressed master; no generative edits."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SIZE = (1024, 1536)
master = Image.open(ROOT / 'art-source/characters/linjin-raincoat-reference.png').convert('RGBA')
shirt = Image.open(ROOT / 'art-source/characters/posture-fix/linjin-base-before.png').convert('RGBA')
# Discard the generated atmospheric fringe, outside the opaque pixel silhouette.
for im in (master, shirt):
    alpha = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    clean = Image.new('RGBA', SIZE)
    clean.paste(im, mask=alpha)
    clean.putalpha(alpha)
    im.paste(clean)
mask = Image.new('L', SIZE)
d = ImageDraw.Draw(mask)
d.polygon([(0,235),(428,235),(445,283),(430,300),(411,326),
 (399,365),(394,415),(386,465),(377,512),(360,566),(344,608),
 (333,655),(322,707),(313,757),(306,810),(301,868),(330,890),
 (346,950),(361,1093),(304,1130),(0,1130)], fill=255)
d.polygon([(548,210),(1024,210),(1024,1150),(645,1150),
 (643,1100),(632,1050),(612,1000),(593,950),(574,900),(562,850),
 (547,805),(539,775),(530,737),(520,700),(508,665),(498,635),
 (489,604),(488,575),(476,549),(472,517),(464,494),(462,471),
 (468,451),(470,429),(474,410),(478,400),(480,390),(482,380),(484,369),
 (488,361),(488,352),(493,345),(494,317),(507,286),(530,264)], fill=255)
d.polygon([(468,915),(515,915),(520,1095),(468,1095)], fill=255)
# Separate the original hat grip from the garment for foreground occlusion.
d.polygon([(230,764),(256,766),(275,780),(285,800),(290,845),
 (282,889),(250,900),(209,868),(205,813)], fill=0)
grip_mask = Image.new('L', SIZE)
g = ImageDraw.Draw(grip_mask)
g.polygon([(718,750),(748,744),(778,748),(790,787),(790,825),
 (774,849),(749,861),(719,858),(696,841),(690,808),(702,775)], fill=255)
mask = ImageChops.subtract(mask, grip_mask)
mask.save(OUT / 'coat-mask.png')
grip_mask.save(OUT / 'grip-mask.png')
grip = master.copy()
grip.putalpha(ImageChops.multiply(master.getchannel('A'), grip_mask))
coat = master.copy()
coat.putalpha(ImageChops.multiply(master.getchannel('A'),mask))
# The intact inner-shirt asset supplies all previously hidden anatomy.
# Derive a new dressed master without cutting shirt seams into the body.
body = shirt.copy()
# Keep transparent pixels canonical; all layers use identical canvas coordinates.
for im in (body, coat, grip):
    clean = Image.new('RGBA', SIZE)
    clean.paste(im, mask=im.getchannel('A'))
    im.paste(clean)
combined = Image.alpha_composite(Image.alpha_composite(body,coat), grip)
master.save(OUT / 'master.png')
body.save(OUT / 'body.png')
coat.save(OUT / 'coat.png')
grip.save(OUT / 'grip.png')
combined.save(OUT / 'combined.png')
print('Candidate saved for visual review; no exact reconstruction claim.')
bg = Image.new('RGBA', (1024*3,1536),'#20332d')
for i,im in enumerate((body,Image.alpha_composite(coat,grip),combined)):
 bg.alpha_composite(im,(1024*i,0))
bg.resize((1024,512),Image.Resampling.LANCZOS).save(OUT / 'layers-preview.png')

# Explicit export: PNG optimization preserves every decoded pixel of the candidates.
if '--install' in __import__('sys').argv:
    import json
    import shutil
    import PIL
    records = []
    for source, target in [('body.png', 'linjin-base.png'), ('coat.png', 'raincoat-layer.png'), ('grip.png', 'raincoat-grip.png')]:
        src = OUT / source
        opt = OUT / (source.removesuffix('.png') + '-optimized.png')
        with Image.open(src) as im:
            im.save(opt, optimize=True, compress_level=9)
            with Image.open(opt) as check:
                assert im.size == check.size and im.convert('RGBA').tobytes() == check.convert('RGBA').tobytes()
        selected = opt if opt.stat().st_size < src.stat().st_size else src
        shutil.copyfile(selected, ROOT / 'public/assets/character' / target)
        records.append({'source': source, 'runtime': target, 'tool': f'Pillow {PIL.__version__} PNG optimize=True compress_level=9', 'before': src.stat().st_size, 'after': selected.stat().st_size, 'rgba_identical': True, 'dimensions': list(SIZE)})
    (OUT / 'compression.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(records, ensure_ascii=False))
