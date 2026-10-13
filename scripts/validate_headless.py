#!/usr/bin/env python3
"""Validation indépendante CSV + navigateur Chromium/CDP du build dist/.

Usage : python3 scripts/validate_headless.py [--port 8901]
Dépendances Python : websocket-client. Le build doit être préparé auparavant.
"""
import argparse
import collections
import csv
import json
import shutil
import socket
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAILURES = []
COUNT = 0


def check(label, ok, detail=''):
    global COUNT
    COUNT += 1
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}" + (f' — {detail}' if detail else ''))
    if not ok:
        FAILURES.append(label)


def expected_from_csv():
    with (ROOT / 'data/staging/fact_credits.csv').open(encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    expected = {}
    for ct in ('CP', 'AE'):
        missions = collections.defaultdict(lambda: [0, 0])
        for r in rows:
            if r['type_credit'] == ct and r['programme'] == '(total mission)':
                missions[r['mission']][int(r['annee']) - 2026] += int(r['montant'])
        expected[ct] = {
            'missions': missions,
            't26': sum(v[0] for v in missions.values()),
            't27': sum(v[1] for v in missions.values()),
            'top': max(missions, key=lambda n: missions[n][1]),
            'min': min(missions, key=lambda n: missions[n][1]),
        }
    keys = [(r['scope'], r['mission'], r['programme'], r['type_credit'], r['annee']) for r in rows]
    check('pas de doublons de faits', len(keys) == len(set(keys)))
    check('32 missions CP et AE', all(len(expected[ct]['missions']) == 32 for ct in expected))
    check('contrat numérique et unité', all(r['montant'].isdigit() and r['unite'] == 'EUR' for r in rows))
    check('copies servies synchronisées', all((ROOT / 'data/staging' / n).read_bytes() == (ROOT / 'sqlrooms-dashboard/dist/data' / n).read_bytes() for n in ('fact_credits.csv', 'dim_contexte.csv', 'fact_mesures_plfss.csv')))
    return expected


def fmt(n):
    s = f'{n / 1e9:.1f}'.replace('.', ',')
    return (s[:-2] if s.endswith(',0') else s) + ' Md€'


class Browser:
    def __init__(self, port):
        executable = shutil.which('chromium-browser') or shutil.which('chromium')
        if not executable:
            raise RuntimeError('Chromium introuvable')
        import tempfile
        self.profile = tempfile.TemporaryDirectory(prefix='budget-chromium-')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            debug_port = sock.getsockname()[1]
        self.proc = subprocess.Popen([executable, '--headless', '--no-sandbox', '--disable-gpu',
                                     '--remote-allow-origins=*', f'--user-data-dir={self.profile.name}',
                                     f'--remote-debugging-port={debug_port}', f'http://localhost:{port}/'],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.ws = None
        self.id = 0
        for _ in range(100):
            try:
                targets = json.load(urllib.request.urlopen(f'http://localhost:{debug_port}/json', timeout=1))
                page = next(t for t in targets if t['type'] == 'page')
                import websocket
                self.ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=20)
                break
            except Exception:
                time.sleep(.1)
        if not self.ws:
            self.close()
            raise RuntimeError('Chromium CDP inaccessible')

    def command(self, method, params=None):
        self.id += 1
        self.ws.send(json.dumps({'id': self.id, 'method': method, 'params': params or {}}))
        while True:
            response = json.loads(self.ws.recv())
            if response.get('id') == self.id:
                if 'error' in response:
                    raise RuntimeError(response['error'])
                return response.get('result', {})

    def js(self, expression):
        result = self.command('Runtime.evaluate', {'expression': expression, 'returnByValue': True, 'awaitPromise': True})
        if 'exceptionDetails' in result:
            raise RuntimeError(result['exceptionDetails'])
        return result.get('result', {}).get('value')

    def wait(self, expression, timeout=30):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            result = self.js(expression)
            if result:
                return result
            time.sleep(.1)
        raise RuntimeError(f'Délai dépassé : {expression}')

    def click(self, selector):
        if not self.js(f"(() => {{ const e = document.querySelector({json.dumps(selector)}); if (!e) return false; if (e.click) e.click(); else e.dispatchEvent(new MouseEvent('click', {{bubbles:true}})); return true; }})()"):
            raise RuntimeError(f'Élément absent : {selector}')
        time.sleep(.15)

    def type(self, text):
        self.js(f"(() => {{ const e = document.querySelector('.search-input input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, {json.dumps(text)}); e.dispatchEvent(new Event('input', {{bubbles: true}})); }})()")
        time.sleep(.15)

    def key(self, key, code=None, **extra):
        codes = {'Enter': 13, 'Tab': 9, ' ': 32, 'Escape': 27}
        params = {'key': key, 'code': code or key, 'windowsVirtualKeyCode': codes.get(key, 0), **extra}
        self.command('Input.dispatchKeyEvent', {'type': 'keyDown', 'text': '\r' if key == 'Enter' else ' ' if key == ' ' else '', **params})
        self.command('Input.dispatchKeyEvent', {'type': 'keyUp', **params})
        time.sleep(.15)

    def close(self):
        if self.ws:
            try:
                self.command('Browser.close')
            except Exception:
                pass
            self.ws.close()
        self.proc.terminate()
        try:
            self.proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.proc.kill()
            self.proc.wait()
        for _ in range(30):
            try:
                self.profile.cleanup()
                break
            except OSError:
                time.sleep(.1)


def run_ui_checks(browser, exp):
    b = browser
    b.wait("!!document.querySelector('.kpis')")
    check('pas d’écran d’erreur', not b.js("document.body.innerText.includes('Erreur au lancement')"))
    check('titre citoyen', b.js("document.querySelector('h1').innerText.includes('Où va l’argent')"))
    check('avertissement crédits non exécutés', b.js("document.body.innerText.includes('Ils ne représentent pas encore les dépenses effectivement réalisées.')"))
    check('données fictives annoncées', b.js("document.body.innerText.includes('fictif / simulé')"))
    for ct in ('CP', 'AE'):
        b.click(f'.seg button:nth-child({1 if ct == "CP" else 2})')
        b.wait(f"document.querySelector('.kpis')?.innerText.includes('{fmt(exp[ct]['t27'])}')")
        text = b.js("document.querySelector('.kpis').innerText")
        check(f'KPI {ct} 2027 = totaux imprimés', fmt(exp[ct]['t27']) in text)
        check(f'KPI {ct} 2026', fmt(exp[ct]['t26']) in text)
        check(f'KPI {ct} évolution', fmt(abs(exp[ct]['t27'] - exp[ct]['t26'])) in text)
        check(f'32 barres de classement {ct}', b.js("document.querySelectorAll('.horizontal-ranking li').length") == 32)
    b.click('.seg button:first-child')
    b.wait(f"document.querySelector('.kpis')?.innerText.includes('{fmt(exp['CP']['t27'])}')")
    check('cinq postes principaux', b.js("document.querySelectorAll('.top5 button').length") == 5)
    check('classement top = plus grande mission', exp['CP']['top'] in b.js("document.querySelector('.horizontal-ranking li').innerText"))
    check('pour 100 € avec périmètre', b.js("document.querySelector('.hundred').innerText.includes('Autres missions')"))
    check('graphiques secondaires masqués par défaut', b.js("document.querySelectorAll('.tm-cell').length") == 0)
    check('table accessible : 32 missions', b.js("document.querySelector('table.tbl tbody').rows.length") == 32)
    check('total en pied de tableau', b.js("document.querySelector('table.tbl tfoot').innerText.toLowerCase().includes('32 missions')"))
    b.click('table.tbl thead th:nth-child(3) button')
    check('tri ascendant', exp['CP']['min'] in b.js("document.querySelector('table.tbl tbody tr').innerText"))
    check('aria-sort ascendant', b.js("document.querySelector('table.tbl thead th:nth-child(3)').getAttribute('aria-sort')") == 'ascending')
    b.click('table.tbl thead th:nth-child(3) button')
    b.type('Défense')
    check('recherche Défense = une mission', b.js("document.querySelector('table.tbl tbody').rows.length") == 1)
    check('KPI filtrés Défense', fmt(exp['CP']['missions']['Défense'][1]) in b.js("document.querySelector('.kpis').innerText"))
    b.type('zzzz-aucune')
    check('recherche vide', b.js("document.querySelector('.empty')?.innerText.includes('Aucune mission')"))
    b.click('.reset-btn')
    check('réinitialisation', b.js("document.querySelector('table.tbl tbody').rows.length") == 32)
    b.type('Investir')
    b.js("document.querySelector('.mission-link').focus()")
    b.key('Enter')
    b.wait("document.querySelector('.mission-detail table tbody')?.rows.length === 5")
    check('Investir 2030 : cinq programmes restaurés', b.js("document.querySelector('.mission-detail table tbody').rows.length") == 5)
    check('fiche mission : total imprimé 2027', '4 Md€' in b.js("document.querySelector('.mission-facts').innerText"))
    check('fiche mission : part du budget complet malgré filtre', '0,7 %' in b.js("document.querySelector('.mission-facts').innerText"))
    check('fiche mission : focus sur titre', b.js("document.activeElement.id") == 'mission-title')
    check('fiche mission : sources 309 et 310', b.js("document.querySelector('.mission-detail').innerText.includes('309') && document.querySelector('.mission-detail').innerText.includes('310')"))
    b.js("document.querySelector('.back-btn').focus()")
    b.key(' ', 'Space', windowsVirtualKeyCode=32)
    b.wait("!!document.querySelector('.horizontal-ranking')")
    check('retour clavier : focus restauré', b.js("document.activeElement.className") == 'mission-link')
    check('retour : recherche conservée', b.js("document.querySelector('.search-input input').value") == 'Investir')
    b.click('.reset-btn')
    b.js("window.__exportBlob = null; window.__createURL = URL.createObjectURL; URL.createObjectURL = blob => { window.__exportBlob = blob; return window.__createURL(blob); }")
    b.click('.missions-export')
    exported = b.js("window.__exportBlob.text()")
    import io
    records = list(csv.DictReader(io.StringIO(exported.lstrip('\ufeff'))))
    check('export CSV : 64 lignes sourcées', len(records) == 64 and all(r['source_document'] == 'l17b3210_projet-loi.pdf' for r in records))
    check('export CSV : total identique au KPI', sum(int(r['montant']) for r in records if r['annee'] == '2027') == exp['CP']['t27'])
    b.click('.expert-toggle')
    b.wait("document.querySelectorAll('.tm-cell').length === 32")
    check('vue experte : 32 cellules treemap', b.js("document.querySelectorAll('.tm-cell').length") == 32)
    check('vue experte : 28 barres comparatives', b.js("document.querySelectorAll('.recharts-bar-rectangle').length") == 28)
    b.wait("document.querySelector('.raw-export')?.innerText.includes('668')")
    check('vue experte : 668 faits bruts', b.js("document.querySelector('.raw-export').innerText.includes('668')"))
    check('vue experte : réconciliation explicite', b.js("document.querySelector('.quality-summary').innerText.includes('Aucun écart')"))
    b.click('.tm-cell')
    b.wait("!!document.querySelector('.mission-detail')")
    check('treemap : navigation mission', 'Remboursements' in b.js("document.querySelector('#mission-title').innerText"))
    b.js('history.back()')
    b.wait("!!document.querySelector('.horizontal-ranking')")
    check('retour navigateur : missions', b.js("document.querySelector('table.tbl tbody').rows.length") == 32)
    b.wait("document.querySelectorAll('.ctx-card').length === 6 && document.querySelector('.plfss-table tbody')?.rows.length === 17")
    context = b.js("document.querySelector('.budget-context').innerText")
    check('contexte : 43 et 54 Md€ séparés', '43 Md€' in context and '54 Md€' in context and 'trajectoire à politique inchangée' in context)
    check('contexte : unités, année, périmètre et source', 'Administrations publiques' in context and '2027' in context and 'source p. 12' in context)
    check('PLFSS : 17 mesures sans total', b.js("document.querySelector('.plfss-table tbody').rows.length === 17 && !document.querySelector('.plfss-table tfoot')"))
    check('PLFSS : ONDAM, économies et solde', all(value in context for value in ('278,7 Md€', '5,1 Md€', '−12,7 Md€')))
    check('PLFSS : réserves', 'non publiée' in context and 'ne pas additionner' in context.lower())
    b.type('Défense')
    check('contexte indépendant des filtres', b.js("document.querySelectorAll('.ctx-card').length") == 6 and b.js("document.querySelector('.plfss-table tbody').rows.length") == 17)
    b.click('.reset-btn')
    b.click('.plfss-export')
    exported = b.js('window.__exportBlob.text()')
    records = list(csv.DictReader(io.StringIO(exported.lstrip('\ufeff'))))
    check('export PLFSS non additif et sourcé', len(records) == 17 and all(r['source_document'] == 'plfss_2027_texte.pdf' for r in records))
    for name in ('l17b3210_projet-loi.pdf', 'plfss_2027_texte.pdf'):
        check(f'PDF source servi : {name}', b.js(f"fetch('/sources/{name}').then(r => r.ok && r.headers.get('content-type').includes('pdf'))"))
    b.click('a[href="/?page=methodologie"]')
    b.wait("!!document.querySelector('.glossary')")
    check('page méthodologie et glossaire', b.js("document.querySelectorAll('.glossary dt').length") == 10)
    check('méthodologie sans WASM', b.js("!performance.getEntriesByType('resource').some(r => r.name.includes('.wasm'))"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8901)
    args = ap.parse_args()
    with socket.socket() as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(('127.0.0.1', args.port))  # échoue plutôt que tester un serveur préexistant
    server = subprocess.Popen(['python3', '-m', 'http.server', str(args.port), '--directory', str(ROOT / 'sqlrooms-dashboard/dist')], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    browser = None
    try:
        exp = expected_from_csv()
        browser = Browser(args.port)
        run_ui_checks(browser, exp)
    except Exception as e:
        check('exécution des tests', False, str(e))
    finally:
        try:
            if browser:
                browser.close()
        finally:
            server.terminate()
            server.wait()
    print(f'\nRésultat : {COUNT - len(FAILURES)}/{COUNT} PASS')
    raise SystemExit(1 if FAILURES else 0)


if __name__ == '__main__':
    main()
