# Hojas de contacto para identificar la camiseta de Ferro en cada partido (fotos de las crónicas de FerroWeb).
# Uso: python3 scripts/camisetas/hojas.py DESDE HASTA [carpeta_salida]   (fechas AAAA-MM-DD;   (requiere Pillow; baja ~6 fotos por partido, espaciadas)
# Arma hojas de 6 partidos (una fila por partido, con el número de síntesis/crónica a la izquierda) para mirarlas.
import sys, re, io, time, json, subprocess, os
from PIL import Image, ImageDraw, ImageFont
desde, hasta = sys.argv[1], sys.argv[2]; anio = desde[:4]; sal = sys.argv[3] if len(sys.argv) > 3 else f'/tmp/hojas_{desde}'
os.makedirs(sal, exist_ok=True)
UA = 'ferro-en-numeros (camisetas, autorizado por FerroWeb)'
A = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'datos-fuente', 'archivo-ferroweb.json')))['paginas']
views = [p['view'] for p in sorted([p for p in A if p.get('sintesis') and desde <= (p.get('dia') or '') <= hasta], key=lambda p: p['dia'])]
def get(u): return subprocess.run(['curl', '-sS', '-m', '40', '-A', UA, u], capture_output=True).stdout
try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
except Exception: f = ImageFont.load_default()
W, H = 230, 155
for i in range(0, len(views), 6):
    rows = []
    for v in views[i:i+6]:
        h = get(f'https://www.ferroweb.com.ar/v1/?mod=futbol&sub=cronica&view={v}').decode('cp1252', 'replace')
        imgs = list(dict.fromkeys(re.findall(r'src="(futbol/img/[^"]+\.jpe?g)"', h, re.I)))
        n = len(imgs); idx = sorted(set(k for k in [0, 1, n//4, n//2, 3*n//4, n-1] if 0 <= k < n)); th = []
        for k in idx:
            b = get('https://www.ferroweb.com.ar/v1/' + imgs[k]); time.sleep(.3)
            try: im = Image.open(io.BytesIO(b)).convert('RGB'); im.thumbnail((W, H)); th.append(im)
            except Exception: pass
        rows.append((v, n, th))
    hoja = Image.new('RGB', (60 + 6*(W+3), len(rows)*(H+3)), 'white'); d = ImageDraw.Draw(hoja)
    for k, (v, n, th) in enumerate(rows):
        y = k*(H+3); d.text((3, y+H//2-10), str(v), fill='black', font=f)
        for j, im in enumerate(th): hoja.paste(im, (60+j*(W+3), y))
    nom = os.path.join(sal, f'{anio}_{rows[0][0]}_{rows[-1][0]}.jpg'); hoja.save(nom, quality=85)
    print(nom, [(v, n, len(th)) for v, n, th in rows])
