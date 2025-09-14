import requests
import pandas as pd
import os

website = requests.get('https://soul-knight.fandom.com/wiki/Characters').text
# with open('characters.html', 'w', encoding='utf-8') as f:
#     f.write(website)

base = "https://soul-knight.fandom.com"
# tables = pd.read_html("characters.html", extract_links="all")
tables = pd.read_html(website, extract_links="all")
df = tables[1]

def _pretty(col):
    if isinstance(col, tuple):
        if col[0]:
            return col[0]
        if col[1]:
            return col[1].split("/")[-1].replace("_", " ").title()
    return str(col)

df.columns = [_pretty(c) for c in df.columns]
df = df[['Character', 'ID']].copy()
df['URL'] = df['Character'].apply(lambda x: x[1] if isinstance(x, tuple) else None)
df["Character"] = df["Character"].apply(lambda x: x[0] if isinstance(x, tuple) else x)
df['ID'] = [_pretty(c).lstrip('0') for c in df['ID']]
df['ID'] = df['ID'].replace('', '0')
df['ID'] = df['ID'].astype(int)
df = df[df['ID'] < 100]

os.makedirs('Characters', exist_ok=True)
results = {}
for char_i, row in enumerate(df.itertuples()):
    url = base + row.URL
    char = row.Character

    r = requests.get(url)
    # with open('Characters/' + char + '.html', 'w', encoding='utf-8') as f:
    #     f.write(r.text)
    # tables = pd.read_html('Characters/' + char + '.html', extract_links="body")
    tables = pd.read_html(r.text, extract_links="body")
    try:
        df = tables[3]
        df.columns = df.columns.get_level_values(1) 
    except Exception:
        df = tables[4]
        df.columns = df.columns.get_level_values(1)

    names = (
        df["Sort by name"]
        .dropna()
        .apply(lambda x: x[0] if isinstance(x, tuple) else x)
        .apply(lambda x: ' - '.join(x[:50].split(' - ')[:-1]) if ' - ' in x[:50] else x[:50])
        .tolist()
    )

    prices = (
        df["Sort by name"]
        .dropna()
        .apply(lambda x: x[0] if isinstance(x, tuple) else x)
        .apply(lambda x: x[:50].split('-')[-1].split(' Has', 1)[0].split(' Part', 1)[0].split(' has', 1)[0].split(' part', 1)[0].replace('\\xa0', ''))
        .tolist()
    )

    urls = (
        df['Sort by cost']
        .dropna()
        .apply(lambda x: x[1] if isinstance(x, tuple) else None)
        .str.replace('/revision/latest', '', regex=False)
        .tolist()
    )

    results[char] = {
        "id": row.ID,
        "skins": [
            {
                "name": name,
                "url": url,
                "price": price,
                "index": index
            } for index, name, url, price in list(zip(range(len(names)), names, urls, prices))
        ]
    }

with open('characters.json', 'w', encoding='utf-8') as f:
    import json
    json.dump(results, f, ensure_ascii=False)