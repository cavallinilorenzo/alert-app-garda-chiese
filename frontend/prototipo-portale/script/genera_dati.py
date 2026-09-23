# PROTOTIPO. Converte i KML di mappe/ in GeoJSON semplificato e genera segnalazioni finte
# realistiche (posizione vicino a un tracciato vero, tracciato più vicino, zona acquaiolo, priorità).
# Uso, dalla cartella del prototipo: uv run --with shapely --with pyproj python script/genera_dati.py
import json
import random
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path

from pyproj import Transformer
from shapely import STRtree
from shapely.geometry import LineString, MultiLineString, Point, Polygon, mapping
from shapely.ops import transform

RADICE = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parents[1]
K = '{http://www.opengis.net/kml/2.2}'
a_utm = Transformer.from_crs(4326, 32632, always_xy=True).transform
a_wgs = Transformer.from_crs(32632, 4326, always_xy=True).transform
random.seed(10)


def coords(t):
    return [tuple(map(float, c.split(',')[:2])) for c in t.strip().split()]


def leggi(nome, campi):
    root = ET.parse(RADICE / 'mappe' / f'{nome}.kml').getroot()
    feats = []
    for pm in root.iter(K + 'Placemark'):
        props = {d.get('name'): d.text for d in pm.iter(K + 'SimpleData') if d.get('name') in campi}
        poli = pm.find(f'.//{K}Polygon')
        if poli is not None:
            g = Polygon(coords(poli.find(f'.//{K}outerBoundaryIs//{K}coordinates').text))
        else:
            linee = [LineString(coords(c.text)) for c in pm.iter(K + 'coordinates')]
            g = MultiLineString(linee) if len(linee) > 1 else linee[0]
        feats.append((g, props))
    return feats


CAMPI_TRACCIATO = ['CODICE_CAN', 'NOME_COMPL', 'COMUNI']
layer = {
    'canali': leggi('RIB_Canali_2026', CAMPI_TRACCIATO),
    'condotte': leggi('RIB_Condotte_2026', CAMPI_TRACCIATO),
    'rip': leggi('RIP_2026', CAMPI_TRACCIATO),
    'zone': leggi('acquaioli_2026', ['NOME', 'ZONA']),
}
for k, fs in layer.items():
    fc = {
        'type': 'FeatureCollection',
        'features': [
            {'type': 'Feature', 'properties': p, 'geometry': mapping(g.simplify(0.00008, preserve_topology=True))}
            for g, p in fs
        ],
    }
    (OUT / 'public' / f'{k}.geojson').write_text(json.dumps(fc, separators=(',', ':')))

# ---- segnalazioni finte
tracciati = [(transform(a_utm, g), p, k) for k in ('canali', 'condotte', 'rip') for g, p in layer[k]]
albero = STRtree([t[0] for t in tracciati])
zone = [(transform(a_utm, g), p) for g, p in layer['zone']]

CAT = ['affiora', 'tracima', 'argine', 'ostruzione', 'paratoia', 'sporca', 'altro']
DESCR = {
    'affiora': [
        'Esce acqua dal terreno in mezzo al campo, si sta allargando',
        "C'è acqua che affiora sul bordo della strada vicino al fosso",
        'Pozza che si riforma sempre nello stesso punto del prato',
    ],
    'tracima': ["Il canale è pieno fino all'orlo e l'acqua va sulla strada", 'Il fosso esce e sta allagando il cortile della cascina'],
    'argine': ['La sponda del canale è franata per qualche metro', "Si è aperta una crepa lungo l'argine vicino al ponticello"],
    'ostruzione': ['Rami e plastica bloccano il passaggio sotto il ponte', "Il canale è pieno di erba e l'acqua non scorre"],
    'paratoia': ['La paratoia è rotta e rimane mezza aperta', 'Il volantino della chiusa è stato divelto'],
    'sporca': ["L'acqua del canale è schiumosa e ha un cattivo odore", 'Acqua marrone scuro con chiazze oleose'],
    'altro': ['Una recinzione è caduta dentro il canale', "C'è un animale morto incastrato vicino alla griglia"],
}
DURATE = ['adesso', 'da meno di un’ora', 'da alcune ore', 'da più di un giorno', 'non so']
QUANT = ['gocce', 'piccolo flusso', 'molta acqua', 'non so']
STATI = ['Ricevuta'] * 9 + ['In verifica'] * 6 + ['Assegnata'] * 6 + ['In intervento'] * 4 + ['Chiusa'] * 7
ESITI = ['risolta', 'risolta', 'risolta', 'duplicata', 'duplicata', 'non di competenza', 'non riscontrata', 'falsa']
OPERATORI = ['Giulia Bertoni', 'Marco Zanetti', 'Sara Lombardi']


# Regole del ticket "Criteri di priorità delle segnalazioni" (#8).
def priorita(s):
    if 'sì' in s['pericoli'].values():
        return 'Critica', ['pericolo ' + k for k, v in s['pericoli'].items() if v == 'sì']
    fattori = []
    if s['categoria'] in ('tracima', 'argine', 'paratoia'):
        fattori.append('categoria')
    if s['quantita'] == 'molta acqua':
        fattori.append('molta acqua')
    if fattori:
        return 'Alta', fattori
    if s['categoria'] in ('affiora', 'ostruzione'):
        return 'Media', ['categoria']
    if s['quantita'] == 'piccolo flusso':
        return 'Media', ['piccolo flusso']
    return 'Bassa', ['nessun indicatore forte']


ora = datetime(2026, 9, 24, 11, 30)
seg = []
for i in range(34):
    g, _, _ = random.choice(tracciati)
    p = g.interpolate(random.random(), normalized=True)
    punto = Point(p.x + random.uniform(-120, 120), p.y + random.uniform(-120, 120))
    tg, tp, ttipo = tracciati[albero.nearest(punto)]
    zona = next(((zp['NOME'], zp['ZONA']) for zg, zp in zone if zg.contains(punto)), (None, None))
    cat = 'affiora' if ttipo == 'condotte' and random.random() < 0.6 else random.choice(CAT)
    per = {k: ('sì' if random.random() < 0.06 else random.choice(['no', 'no', 'non so'])) for k in ('persone', 'strada', 'edifici')}
    s = {
        'categoria': cat,
        'pericoli': per,
        'quantita': 'molta acqua' if cat == 'tracima' else random.choice(QUANT),
        'durata': random.choice(DURATE),
    }
    liv, fattori = priorita(s)
    stato = STATI[i % len(STATI)]
    ricevuta = ora - timedelta(minutes=random.randint(5, 60 * 24 * (1 if stato == 'Ricevuta' else 6)))
    lon, lat = a_wgs(punto.x, punto.y)
    acq_zona = zona[0] if zona[0] and zona[0] != 'NON SERVITA' else None
    ingresso = random.choice(['web app'] * 8 + ['numero verde', 'email'])
    seg.append({
        'id': 1041 + i,
        'codice': f'GC-{1041 + i}',
        'ricevuta_il': ricevuta.isoformat(timespec='minutes'),
        'canale_ingresso': ingresso,
        'stato': stato,
        'esito': random.choice(ESITI) if stato == 'Chiusa' else None,
        'priorita': liv,
        'priorita_calcolata': liv,
        'fattori': fattori,
        **s,
        'confidenza': {k: round(random.uniform(0.55, 0.99), 2) for k in ('categoria', 'pericoli', 'durata', 'quantita')},
        'descrizione': random.choice(DESCR[cat]),
        'transcript': None,
        'lat': round(lat, 6),
        'lng': round(lon, 6),
        'infrastruttura': {
            'layer': {'canali': 'Canale', 'condotte': 'Condotta', 'rip': 'Reticolo principale'}[ttipo],
            'codice': tp.get('CODICE_CAN'),
            'nome': tp.get('NOME_COMPL'),
            'distanza_m': round(tg.distance(punto)),
        },
        'zona': zona[1],
        'acquaiolo_zona': acq_zona,
        'acquaiolo': acq_zona if stato in ('Assegnata', 'In intervento', 'Chiusa') else None,
        'operatore_riferimento': random.choice(OPERATORI) if stato != 'Ricevuta' else None,
        'segnalante_cellulare': f'+39 3{random.randint(20, 49)} {random.randint(100, 999)} {random.randint(1000, 9999)}',
        'duplicato_di': None,
        'duplicati': [],
        'foto': f'https://picsum.photos/seed/gc{i}/640/420',
    })
    if ingresso == 'web app':
        seg[-1]['transcript'] = (
            f"Allora… {seg[-1]['descrizione'].lower()}. Lo vedo {s['durata']}, "
            + ('mi sembra pericoloso.' if 'sì' in per.values() else 'non mi sembra pericoloso.')
        )

# un originale con i suoi duplicati
orig = next(s for s in seg if s['stato'] == 'In verifica')
for d in [s for s in seg if s['esito'] == 'duplicata']:
    d['duplicato_di'] = orig['id']
    d['lat'], d['lng'] = orig['lat'] + random.uniform(-3e-4, 3e-4), orig['lng'] + random.uniform(-3e-4, 3e-4)
    orig['duplicati'].append(d['id'])

(OUT / 'src' / 'segnalazioni.json').write_text(json.dumps(seg, ensure_ascii=False, indent=1))
nomi = sorted({p['NOME'] for _, p in layer['zone'] if p['NOME'] != 'NON SERVITA'})
rubrica = [
    {
        'nome': n,
        'zona': next(p['ZONA'] for _, p in layer['zone'] if p['NOME'] == n),
        'telefono': f'+39 34{random.randint(0, 9)} {random.randint(100, 999)} {random.randint(1000, 9999)}',
        'note': '',
    }
    for n in nomi
]
(OUT / 'src' / 'rubrica.json').write_text(json.dumps(rubrica, ensure_ascii=False, indent=1))
print(len(seg), 'segnalazioni,', len(rubrica), 'acquaioli')
