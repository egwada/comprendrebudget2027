#!/usr/bin/env python3
"""Validation indépendante CSV + navigateur Chromium/CDP du build dist/.

Usage : python3 scripts/validate_headless.py [--port 8901]
Dépendances Python : websocket-client. Le build doit être préparé auparavant.
"""
import argparse
import collections
import csv
import io
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
    check('copies servies synchronisées', all((ROOT / 'data/staging' / n).read_bytes() == (ROOT / 'sqlrooms-dashboard/dist/data' / n).read_bytes() for n in ('fact_credits.csv', 'dim_contexte.csv', 'fact_mesures_plfss.csv', 'fact_solde_apu.csv', 'fact_solde_budget_general_etat.csv', 'fact_interets_apu.csv', 'fact_encours_dette_apu.csv', 'fact_financement_dette_etat.csv')))
    return expected


def fmt(n):
    s = f'{n / 1e9:.1f}'.replace('.', ',')
    return (s[:-2] if s.endswith(',0') else s) + ' Md€'


class Browser:
    def __init__(self, port):
        self.port = port
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


def _nav(b, view):
    b.click(f'a[href="?vue={view}"]')
    b.wait(f"document.querySelector('.tab-link[aria-current=page]')?.getAttribute('href') === '?vue={view}'")


def audit_accessibility(browser, label):
    source = ROOT / 'sqlrooms-dashboard/node_modules/axe-core/axe.min.js'
    if not source.is_file():
        check(f'axe-core {label}', False, 'Exécuter npm ci dans sqlrooms-dashboard')
        return
    browser.js(source.read_text(encoding='utf-8') + '; true')
    violations = browser.js("axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']}}).then(r => r.violations.map(v => ({id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target)})))")
    check(f'axe-core WCAG A/AA : {label}', not violations, json.dumps(violations, ensure_ascii=False) if violations else '')


def run_ui_checks(browser, exp):
    b = browser
    b.wait("!!document.querySelector('.tab-nav')")
    b.wait("document.querySelectorAll('.home-card').length === 5")
    b.wait("document.querySelectorAll('.home-treemap-mission').length === 32 && document.querySelectorAll('.home-treemap-program').length >= 100")
    audit_accessibility(b, 'accueil')
    check('accueil : treemap hiérarchique, 32 missions et plus de 100 programmes avec crédits', b.js("document.querySelectorAll('.home-treemap-mission').length === 32 && document.querySelectorAll('.home-treemap-program').length >= 100"))
    check('accueil : couleurs distinctes par mission et nuances par programme', b.js("new Set([...document.querySelectorAll('.home-treemap-mission rect')].map(e => e.getAttribute('fill'))).size >= 30 && new Set([...document.querySelectorAll('.home-treemap-program rect')].map(e => e.getAttribute('fill'))).size > 30"))
    check('accueil : tableau alternatif de 135 programmes, sans total en double', b.js("document.querySelectorAll('.home-treemap-values tbody tr').length === 135 && !document.querySelector('.home-treemap-values tfoot')"))
    check('note ECU/EUR présente en bas de page', b.js("document.querySelector('.currency-note').innerText.includes('1 ECU = 1 EUR') && document.querySelector('.currency-note').innerText.includes('pas corrigés de l’inflation')"))
    check('sans paramètre : accueil actif', b.js("document.querySelector('.tab-link[aria-current=page]')?.getAttribute('href') === '?vue=accueil'"))
    check('accueil : cinq repères avec année, périmètre, statut et source', b.js("[...document.querySelectorAll('.home-card-meta')].every(e => e.innerText.split('·').length >= 4)"))
    check('accueil : principal remboursé, année et périmètre explicites', b.js("[...document.querySelectorAll('.home-card')].some(e => e.innerText.includes('Principal de dette') && e.innerText.includes('2024') && e.innerText.includes('État'))"))
    b.click('.home-card:first-child')
    b.wait("location.search.includes('vue=budget') && document.querySelector('.tab-link[aria-current=page]')?.getAttribute('href') === '?vue=budget'")
    check('carte accueil : ouvre Budget avec URL et focus de navigation', b.js("document.activeElement === document.querySelector('.tab-link[aria-current=page]')"))
    b.js('history.back()')
    b.wait("document.querySelector('.tab-link[aria-current=page]')?.getAttribute('href') === '?vue=accueil'")
    check('retour navigateur : restaure Accueil', b.js("location.search === ''"))
    b.js('history.forward()')
    b.wait("document.querySelector('.tab-link[aria-current=page]')?.getAttribute('href') === '?vue=budget'")
    check('avance navigateur : restaure Budget', b.js("location.search.includes('vue=budget')"))
    for direct_view in ('accueil', 'budget', 'dette', 'contexte'):
        b.command('Page.navigate', {'url': f'http://localhost:{b.port}/?vue={direct_view}'})
        b.wait(f"document.querySelector('.tab-link[aria-current=page]')?.getAttribute('href') === '?vue={direct_view}'")
        check(f'URL directe : vue {direct_view}', b.js(f"new URLSearchParams(location.search).get('vue') === '{direct_view}'"))
    b.command('Page.navigate', {'url': f'http://localhost:{b.port}/#mission=Investir%20pour%20la%20France%20de%202030'})
    b.wait("document.querySelector('#mission-title')?.innerText.includes('Investir pour la France de 2030')")
    check('compatibilité ancienne URL #mission sans ?vue', b.js("document.querySelector('.tab-link[aria-current=page]')?.getAttribute('href') === '?vue=budget'"))
    b.click('.back-btn')
    b.wait("!!document.querySelector('.horizontal-ranking')")
    _nav(b, 'budget')
    b.wait("!!document.querySelector('.kpis')")
    check('pas d’écran d’erreur', not b.js("document.body.innerText.includes('Erreur au lancement')"))
    check('titre citoyen', b.js("document.querySelector('h1').innerText.includes('Où va l’argent')"))
    check('avertissement sur les crédits prévus', b.js("document.body.innerText.includes('pas l’argent déjà dépensé')"))
    check('données fictives annoncées', b.js("document.body.innerText.includes('fictif / simulé')"))
    _nav(b, 'dette')
    b.wait("document.querySelector('.finance-financing-table tbody')?.rows.length === 6")
    b.wait("!!document.querySelector('#state-balance-title')")
    check('solde État : série INSEE du budget général 2009–2025', b.js("document.querySelector('#state-balance-title').parentElement.innerText.includes('2009–2025') && document.querySelector('#state-balance-title').parentElement.innerText.includes('comptes spéciaux sont publiés à part')"))
    check('solde État : valeur INSEE de décembre 2024', b.js("(() => { const s=document.querySelector('#state-balance-title').parentElement; const d=s.querySelector('details'); d.open=true; const found=[...s.querySelectorAll('tbody tr')].some(r=>r.innerText.includes('2024') && r.innerText.includes('-156,3 Md€')); d.open=false; return found; })()"))
    check('solde public : série APU 1974–2024, dernier solde non déficitaire en 1974', b.js("document.querySelector('.debt-balance').innerText.includes('dernier solde non déficitaire est celui de 1974') && document.querySelector('.debt-balance').innerText.includes('Ce n’est donc pas le seul budget de l’État')"))
    check('solde historique : 51 années et ligne zéro', b.js("document.querySelectorAll('.debt-balance section .recharts-bar-rectangle').length >= 51 && document.querySelector('.debt-balance .finance-finding').innerText.includes('2024')"))
    check('encours dette : deuxième graphique en % du PIB', b.js("!!document.querySelector('#debt-stock-gdp-title') && document.querySelector('#debt-stock-gdp-title').parentElement.querySelectorAll('.recharts-bar-rectangle').length === 48"))
    check('graphiques encours utilisent toute la largeur disponible', b.js("(() => { const p=document.querySelector('.finance-debt-panel'), g=document.querySelector('.finance-chart-grid'); return !!p && !!g && p.getBoundingClientRect().width >= g.getBoundingClientRect().width * .95; })()"))
    check('dette État : intérêts, principal et émissions séparés', b.js("document.querySelector('.finance-financing-table tbody tr:last-child').innerText.includes('155,1 Md€') && document.querySelector('.finance-financing-table tbody tr:last-child').innerText.includes('46,5 Md€') && document.querySelector('.finance-financing-table tbody tr:last-child').innerText.includes('285 Md€')"))
    check('dette État : intérêts indisponibles avant 2023 restent manquants', b.js("document.querySelector('.finance-financing-table tbody tr:first-child').innerText.includes('—')"))
    audit_accessibility(b, 'solde et dette')
    _nav(b, 'budget')
    audit_accessibility(b, 'vue citoyenne')
    b.js("window.__exportBlob = null; window.__createURL = URL.createObjectURL; URL.createObjectURL = blob => { window.__exportBlob = blob; return window.__createURL(blob); }")
    b.js("document.querySelector('.skip-link').focus()")
    b.key('Enter')
    check('skip-link mène au contenu principal', b.js("document.activeElement.id") == 'contenu')
    b.key('Tab')
    check('tabulation : premier focus dans le contenu', b.js("document.activeElement === document.querySelector('.seg button')"))
    check('focus visible', b.js("getComputedStyle(document.activeElement).outlineStyle === 'solid'"))
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
    top_five = sorted(exp['CP']['missions'], key=lambda n: exp['CP']['missions'][n][1], reverse=True)[:5]
    check('cinq postes : ordre et montants exacts', b.js("[...document.querySelectorAll('.top5 .name')].map(e => e.innerText)") == top_five and b.js("[...document.querySelectorAll('.top5 .val')].map(e => e.innerText)") == [fmt(exp['CP']['missions'][n][1]) for n in top_five])
    hundred = b.js("[...document.querySelectorAll('.hundred b')].map(e => e.innerText)")
    amounts = [float(s.replace('€', '').replace(',', '.').strip()) for s in hundred]
    check('pour 100 € : parts des cinq postes et reste', all(abs(amounts[i] - exp['CP']['missions'][name][1] / exp['CP']['t27'] * 100) <= .005 for i, name in enumerate(top_five)) and abs(sum(amounts) - 100) <= .03)
    check('classement top = plus grande mission', exp['CP']['top'] in b.js("document.querySelector('.horizontal-ranking li').innerText"))
    check('pour 100 € avec périmètre', b.js("document.querySelector('.hundred').innerText.includes('Tous les autres domaines')"))
    check('graphiques secondaires masqués par défaut', b.js("document.querySelectorAll('.tm-cell').length") == 0)
    check('table accessible : 32 missions', b.js("document.querySelector('table.tbl tbody').rows.length") == 32)
    check('poste dette signalé par une couleur neutre et un appel au clic', b.js("(() => { const row=[...document.querySelectorAll('table.tbl tbody tr')].find(r=>r.innerText.includes('Engagements financiers de l’État')); const cue=row?.querySelector('.debt-cue'); return !!row?.classList.contains('debt-focus-row') && cue?.innerText.includes('Voir le détail') && getComputedStyle(cue).backgroundColor !== 'rgba(0, 0, 0, 0)' && !!document.querySelector('.top5 .debt-cue'); })()"))
    check('total en pied de tableau', b.js("document.querySelector('table.tbl tfoot').innerText.toLowerCase().includes('32 domaines')"))
    b.click('table.tbl thead th:nth-child(3) button')
    check('tri ascendant', exp['CP']['min'] in b.js("document.querySelector('table.tbl tbody tr').innerText"))
    check('aria-sort ascendant', b.js("document.querySelector('table.tbl thead th:nth-child(3)').getAttribute('aria-sort')") == 'ascending')
    b.click('table.tbl thead th:nth-child(3) button')
    b.type('Défense')
    check('recherche Défense = une mission', b.js("document.querySelector('table.tbl tbody').rows.length") == 1)
    check('KPI filtrés Défense', fmt(exp['CP']['missions']['Défense'][1]) in b.js("document.querySelector('.kpis').innerText"))
    b.type('zzzz-aucune')
    check('recherche vide', b.js("document.querySelector('.empty')?.innerText.includes('Aucun domaine')"))
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
    audit_accessibility(b, 'fiche mission')
    check('fiche mission : contexte masqué', b.js("!document.querySelector('.budget-context')"))
    b.click('.mission-detail .export-btn')
    records = list(csv.DictReader(io.StringIO(b.js('window.__exportBlob.text()').lstrip('\ufeff'))))
    check('export programmes : dix faits Investir 2030', len(records) == 10 and all(r['mission'] == 'Investir pour la France de 2030' for r in records))
    check('export programmes : montant réconcilié', sum(int(r['montant']) for r in records if r['annee'] == '2027') == 3999870000)
    b.click('.seg button:nth-child(2)')
    b.wait("document.querySelector('.mission-detail table tbody')?.rows.length === 5")
    check('Investir 2030 : AE zéro conservé', b.js("document.querySelector('.mission-facts').innerText.includes('0 €')"))
    b.click('.seg button:first-child')
    b.wait("document.querySelector('.mission-facts')?.innerText.includes('4 Md€')")
    b.js("document.querySelector('.back-btn').focus()")
    b.key(' ', 'Space', windowsVirtualKeyCode=32)
    b.wait("!!document.querySelector('.horizontal-ranking')")
    check('retour clavier : focus restauré', b.js("document.activeElement.classList.contains('mission-link') && document.activeElement.innerText.includes('Investir')"))
    check('retour : recherche conservée', b.js("document.querySelector('.search-input input').value") == 'Investir')
    b.click('.reset-btn')
    b.click('.missions-export')
    exported = b.js("window.__exportBlob.text()")
    records = list(csv.DictReader(io.StringIO(exported.lstrip('\ufeff'))))
    check('export CSV : 64 lignes sourcées', len(records) == 64 and all(r['source_document'] == 'l17b3210_projet-loi.pdf' for r in records))
    check('export CSV : total identique au KPI', sum(int(r['montant']) for r in records if r['annee'] == '2027') == exp['CP']['t27'])
    b.js("document.querySelector('table.tbl thead th:nth-child(3) button').focus()")
    b.key('Enter')
    check('tri clavier Entrée', b.js("document.querySelector('table.tbl thead th:nth-child(3)').getAttribute('aria-sort')") == 'ascending')
    b.key(' ', 'Space')
    check('tri clavier Espace', b.js("document.querySelector('table.tbl thead th:nth-child(3)').getAttribute('aria-sort')") == 'descending')
    b.click('.expert-toggle')
    b.wait("document.querySelectorAll('.tm-cell').length === 32")
    check('vue experte : 32 cellules treemap', b.js("document.querySelectorAll('.tm-cell').length") == 32)
    check('treemap : montant dans le libellé accessible', fmt(exp['CP']['missions'][exp['CP']['top']][1]) in b.js("document.querySelector('.tm-cell').getAttribute('aria-label')"))
    check('vue experte : 28 barres comparatives', b.js("document.querySelectorAll('.grid-2 .recharts-bar-rectangle').length") == 28)
    b.wait("document.querySelector('.raw-export')?.innerText.includes('668')")
    check('vue experte : 668 faits bruts', b.js("document.querySelector('.raw-export').innerText.includes('668')"))
    check('vue experte : réconciliation explicite', b.js("document.querySelector('.quality-summary').innerText.includes('correspondent à la somme des programmes')"))
    audit_accessibility(b, 'vue experte')
    b.click('.raw-export')
    records = list(csv.DictReader(io.StringIO(b.js('window.__exportBlob.text()').lstrip('\ufeff'))))
    check('export brut : 668 faits et qualité', len(records) == 668 and all(r['qualite_extraction'] in ('extrait_pdf', 'cellules_vides_zero') for r in records))
    b.js("document.querySelector('.tm-cell').focus()")
    b.key('Enter')
    b.wait("!!document.querySelector('.mission-detail')")
    check('treemap : navigation mission', 'Remboursements' in b.js("document.querySelector('#mission-title').innerText"))
    b.js('history.back()')
    b.wait("!!document.querySelector('.horizontal-ranking')")
    check('retour navigateur : missions', b.js("document.querySelector('table.tbl tbody').rows.length") == 32)
    b.wait("document.querySelectorAll('.recharts-bar-rectangle').length === 28")
    b.js("document.querySelector('.recharts-bar-rectangle').scrollIntoView({block: 'center'})")
    coords = b.js("(() => { const r = document.querySelector('.recharts-bar-rectangle').getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; })()")
    b.command('Input.dispatchMouseEvent', {'type': 'mouseMoved', **coords})
    time.sleep(.2)
    b.command('Input.dispatchMouseEvent', {'type': 'mousePressed', 'button': 'left', 'clickCount': 1, **coords})
    b.command('Input.dispatchMouseEvent', {'type': 'mouseReleased', 'button': 'left', 'clickCount': 1, **coords})
    b.wait("!!document.querySelector('.mission-detail')")
    check('comparatif : clic ouvre la mission au libellé complet', b.js("document.querySelector('#mission-title').innerText") == exp['CP']['top'])
    b.click('.back-btn')
    _nav(b, 'contexte')
    b.wait("document.querySelectorAll('.ctx-card').length === 6 && document.querySelector('.plfss-table tbody')?.rows.length === 17")
    audit_accessibility(b, 'mesures et contexte')
    context = b.js("document.querySelector('.budget-context').innerText")
    check('contexte : 43 et 54 Md€ distingués sans les additionner', '43 Md€' in context and '54 Md€' in context and 'Les 43 Md€ sont déjà compris dans les 54 Md€' in context)
    check('contexte : unités, année, périmètre et source', 'Administrations publiques' in context and '2027' in context and 'Voir la source, page 12' in context)
    check('PLFSS : 17 mesures sans total', b.js("document.querySelector('.plfss-table tbody').rows.length === 17 && !document.querySelector('.plfss-table tfoot')"))
    check('PLFSS : ONDAM, économies et solde', all(value in context for value in ('278,7 Md€', '5,1 Md€', '−12,7 Md€')))
    check('PLFSS : réserves', 'pas publiée' in context and 'ne pas additionner' in context.lower())
    b.click('.context-export')
    records = list(csv.DictReader(io.StringIO(b.js('window.__exportBlob.text()').lstrip('\ufeff'))))
    check('export contexte : six chiffres et dérivation signalée', len(records) == 6 and any(r['qualite_extraction'] == 'derive' for r in records))
    b.click('.plfss-export')
    exported = b.js('window.__exportBlob.text()')
    records = list(csv.DictReader(io.StringIO(exported.lstrip('\ufeff'))))
    check('export PLFSS non additif et sourcé', len(records) == 17 and all(r['source_document'] == 'plfss_2027_texte.pdf' for r in records))
    for name in ('l17b3210_projet-loi.pdf', 'plfss_2027_texte.pdf', 'neb-2024-gestion-dette-tresorerie-etat.pdf'):
        check(f'PDF source servi : {name}', b.js(f"fetch('/sources/{name}').then(r => r.ok && r.headers.get('content-type').includes('pdf'))"))
    _nav(b, 'budget')
    b.click('.expert-toggle')
    b.command('Emulation.setDeviceMetricsOverride', {'width': 375, 'height': 812, 'deviceScaleFactor': 1, 'mobile': True})
    time.sleep(.2)
    check('mobile : pas de débordement de page', b.js('document.documentElement.scrollWidth <= innerWidth'))
    check('mobile : recherche visible', b.js("document.querySelector('.search-input input').getBoundingClientRect().width <= innerWidth"))
    audit_accessibility(b, 'mobile 375 px, vue Budget')
    _nav(b, 'accueil')
    check('mobile 375 px : accueil sans débordement', b.js("document.documentElement.scrollWidth <= innerWidth && document.querySelectorAll('.home-card').length === 5 && document.querySelectorAll('.home-treemap-mission').length === 32"))
    audit_accessibility(b, 'mobile 375 px, accueil')
    _nav(b, 'budget')
    b.command('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-reduced-motion', 'value': 'reduce'}]})
    check('réduction des animations', b.js("matchMedia('(prefers-reduced-motion: reduce)').matches && getComputedStyle(document.querySelector('.mcard')).transitionDuration === '0s'"))
    b.command('Emulation.setDeviceMetricsOverride', {'width': 640, 'height': 450, 'deviceScaleFactor': 2, 'mobile': False})
    b.js("document.documentElement.style.zoom = '2'")
    time.sleep(.3)  # Laisser ResizeObserver/Recharts recalculer les graphiques au nouveau zoom.
    check('zoom 200 % : pas de débordement de page', b.js('document.documentElement.scrollWidth <= innerWidth'))
    b.js("document.documentElement.style.zoom = ''")
    b.command('Emulation.clearDeviceMetricsOverride')
    b.click('a[href="/?page=methodologie"]')
    b.wait("!!document.querySelector('.glossary')")
    check('page méthodologie et glossaire', b.js("document.querySelectorAll('.glossary dt').length") == 12)
    check('méthodologie sans WASM', b.js("!performance.getEntriesByType('resource').some(r => r.name.includes('.wasm'))"))
    audit_accessibility(b, 'méthodologie')


def run_quality_checks(browser, port, exp):
    """Altère uniquement le CSV du build, puis restaure ses octets, même en échec."""
    path = ROOT / 'sqlrooms-dashboard/dist/data/fact_credits.csv'
    original = path.read_bytes()
    rows = list(csv.DictReader(io.StringIO(original.decode('utf-8'))))
    row = next(r for r in rows if r['mission'] == 'Investir pour la France de 2030'
               and r['programme'] != '(total mission)' and r['type_credit'] == 'CP' and r['annee'] == '2027')
    row['montant'] = str(int(row['montant']) - 1000000)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
    try:
        path.write_text(output.getvalue(), encoding='utf-8')
        browser.command('Network.enable')
        browser.command('Network.setCacheDisabled', {'cacheDisabled': True})
        browser.command('Page.navigate', {'url': f'http://localhost:{port}/?quality-test=1&vue=budget'})
        browser.wait("!!document.querySelector('.quality-alert')")
        check('écart injecté : KPI reste le total imprimé', fmt(exp['CP']['t27']) in browser.js("document.querySelector('.kpis').innerText"))
        browser.type('Investir')
        browser.click('.mission-link')
        browser.wait("!!document.querySelector('.mission-detail .quality-alert')")
        check('écart injecté : fiche mission alerte 2027 +1 M€', '+1 M€' in browser.js("document.querySelector('.mission-detail .quality-alert').innerText"))
        check('écart injecté : total mission non remplacé', '4 Md€' in browser.js("document.querySelector('.mission-facts').innerText"))
    finally:
        path.write_bytes(original)
    check('CSV du build restauré après test qualité', path.read_bytes() == original)


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
        run_quality_checks(browser, args.port, exp)
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
