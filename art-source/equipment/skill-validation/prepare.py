"""Prepare fixed-coordinate equipment variants, then verify lossless runtime exports."""
from pathlib import Path
import json
import PIL
from PIL import Image, ImageChops, ImageDraw, ImageFilter
ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
RUNTIME = ROOT / 'public/assets/equipment'
base = Image.open(ROOT / 'public/assets/character/raincoat-layer.png').convert('RGBA')
generated = Image.open(OUT / 'diving-coat-generated.png').convert('RGBA')
assert generated.size == base.size, 'Reject canvas change rather than stretching the garment'
alpha = base.getchannel('A')
# Keep the approved contour and all collar/wrist pixels. Only edit opaque cloth interiors.
mask = alpha.filter(ImageFilter.MinFilter(33))
mask = ImageChops.multiply(mask, generated.getchannel('A').point(lambda a: 255 if a >= 200 else 0))
protect = [(320,190,455,345),(485,180,625,320),(170,675,330,815),(640,650,830,805),(650,780,920,1090),(450,900,540,1140)]
d = ImageDraw.Draw(mask)
for rect in protect:
    d.rectangle(rect, fill=0)
mask = mask.filter(ImageFilter.GaussianBlur(3))
# Reapply guards after feathering so critical pixels stay byte-identical.
d = ImageDraw.Draw(mask)
for rect in protect:
    d.rectangle(rect, fill=0)
mask = ImageChops.multiply(mask, alpha.filter(ImageFilter.MinFilter(17)))
coat = Image.composite(generated, base, mask)
coat.putalpha(alpha)
assert coat.getchannel('A').tobytes() == alpha.tobytes()
for rect in protect:
    assert coat.crop(rect).tobytes() == base.crop(rect).tobytes()
mask.save(OUT / 'cloth-edit-mask.png')
coat.save(OUT / 'diving-coat-layer.png')
# Inventory icon uses the complete generated garment, including its held hat.
# Alpha cleanup is an asset edit; the subsequent export remains pixel-lossless.
icon = generated.copy()
icon.putalpha(icon.getchannel('A').point(lambda a: 255 if a >= 128 else 0))
bbox=icon.getchannel('A').getbbox()
assert bbox
icon.crop(bbox).save(OUT / 'diving-coat-icon.png')
weapon = Image.open(OUT / 'brass-revolver-generated.png').convert('RGBA')
# Only remove transparent margin; preserve aspect and visible image pixels.
bbox=weapon.getchannel('A').point(lambda a: 255 if a > 32 else 0).getbbox()
assert bbox
weapon.crop(bbox).save(OUT / 'brass-revolver-icon.png')
records=[]
for name in ['diving-coat-layer','diving-coat-icon','brass-revolver-icon']:
    source=OUT / (name+'.png'); optimized=OUT / (name+'-optimized.png')
    im=Image.open(source).convert('RGBA')
    im.save(optimized,optimize=True,compress_level=9)
    check=Image.open(optimized).convert('RGBA')
    assert im.size==check.size and im.tobytes()==check.tobytes()
    chosen=optimized if optimized.stat().st_size<source.stat().st_size else source
    (RUNTIME / (name+'.png')).write_bytes(chosen.read_bytes())
    records.append({'asset':name,'tool':f'Pillow {PIL.__version__} PNG optimize=True compress_level=9','before':source.stat().st_size,'after':chosen.stat().st_size,'dimensions':list(im.size),'rgba_identical':True})
raw_difference = ImageChops.difference(alpha.point(lambda a:255 if a>=128 else 0), generated.getchannel('A').point(lambda a:255 if a>=128 else 0))
metrics={'raw_armor_silhouette_changed_pixels': raw_difference.histogram()[255], 'generated_calls':{'armor':1,'weapon':1},'raw_armor_alpha_equal':generated.getchannel('A').tobytes()==alpha.tobytes(),'runtime_alpha_equal':True,'protected_rects':protect,'protected_rgba_equal':True,'compression':records}
(OUT / 'verification.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2)+'\n')
# Preview actual layers at production canvas coordinates.
body=Image.open(ROOT / 'public/assets/character/linjin-base.png').convert('RGBA')
grip=Image.open(ROOT / 'public/assets/character/raincoat-grip.png').convert('RGBA')
combined=Image.alpha_composite(Image.alpha_composite(body,coat),grip)
combined.save(OUT / 'dressed-preview.png')
print(json.dumps(metrics,ensure_ascii=False))
