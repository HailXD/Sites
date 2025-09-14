import requests
import pandas as pd

# website = requests.get('https://soul-knight.fandom.com/wiki/Characters').text
# with open('characters.html', 'w', encoding='utf-8') as f:
#     f.write(website)

# tables = pd.read_html(website, extract_links="body")
tables = pd.read_html("characters.html", extract_links="body")
skills = None
characters = None
skins = []

for i, table in enumerate(tables):
    if 'sort by cost' in [c[1].lower() for c in table.columns]:
        skins.append(table)
        continue
    if characters is None and 'ID' in table.columns.tolist():
        characters = table.copy()
        continue

def _pretty(col):
    if isinstance(col, tuple):
        if col[0]:
            return col[0]
        if col[1]:
            return col[1].split("/")[-1].replace("_", " ").title()
    return str(col)

results = {}

characters = characters[['Character', 'ID']].copy()
characters['Character'] = characters['Character'].apply(lambda x: _pretty(x))
characters['ID'] = characters['ID'].apply(lambda x: int(_pretty(x)))
for ci, c in enumerate(skins):
    char = ' '.join(c.columns[0][0].split(' ')[1:]).split('has')[0].strip()
    results[char] = {
        "id": int(characters[characters['Character'] == char]['ID'].values[0] if char in characters['Character'].values else None),
        "skins": []
    }
    raw_skins = c.iloc[:, 0].tolist()
    skins = [x[1] for x in raw_skins]
    raw_names = [x[0] for x in c.iloc[:, 1].tolist()]

    prices = []
    names = []

    for si, skin in enumerate(raw_names):
        name = '-'.join(skin[:50].split('-')[:-1])
        others = skin.split(name + '-')[1]
        price = ' '.join(others.split(' ')[:3]).strip()
        if price.lower().endswith(('has', 'part')):
            price = price.split(' ')[0]

        results[char]['skins'].append({
            "name": name.strip(),
            "url": skins[si].split('gif/', 1)[0] + 'gif/',
            "price": price,
            "index": si
        })

with open('characters.json', 'w', encoding='utf-8') as f:
    import json
    json.dump(results, f, ensure_ascii=False)