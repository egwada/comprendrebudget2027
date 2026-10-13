#!/usr/bin/env python3
"""Validation bout-en-bout du dashboard PLF 2027 (build dist/).

Partie A : calcule les valeurs attendues depuis data/staging/fact_credits.csv
           (agrégation indépendante de DuckDB/SQL).
Partie B : lance chromium headless contre dist/, pilote l'UI via CDP
           (KPI, bascule CP/AE, recherche, tri, drill-down, retour) et
           compare aux valeurs attendues.
Partie C : contrôles d'intégrité des données (avertissements documentés).

Usage: python3 scripts/validate_headless.py [--port 8901]
Exit code: 0 si tout passe, 1 sinon.
"""

import argparse
import collections
import csv
import json
import re
import subprocess
import sys
import time
import urllib.request

REPO = subprocess.run(
    ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True
).stdout.strip() or "."

FAILURES = []


def check(label, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {label}" + (f" — {detail}" if detail else ""))
    if not ok:
        FAILURES.append(label)


def warn(label, detail=""):
    print(f"  [WARN] {label}" + (f" — {detail}" if detail else ""))


# ---------------------------------------------------------------- Partie A
def expected_from_csv(path):
    rows = list(csv.DictReader(open(path, encoding="utf-8")))
    progs = [r for r in rows if r["programme"] != "(total mission)"]
    exp = {}
    for ct in ("CP", "AE"):
        m = collections.defaultdict(lambda: [0, 0])
        for r in progs:
            if r["type_credit"] != ct:
                continue
            m[r["mission"]][int(r["annee"]) - 2026] += int(r["montant"])
        t26 = sum(v[0] for v in m.values())
        t27 = sum(v[1] for v in m.values())
        top = max(m.items(), key=lambda kv: kv[1][1])
        mini = min(m.items(), key=lambda kv: kv[1][1])
        exp[ct] = {
            "t26": t26, "t27": t27,
            "n": len(m),
            "top_name": top[0], "top26": top[1][0], "top27": top[1][1],
            "min_name": mini[0],
        }
    # programmes de la mission top (CP)
    top = exp["CP"]["top_name"]
    exp["top_programs"] = sorted({r["programme"] for r in progs
                                  if r["mission"] == top})
    # mission Défense
    defn = [r for r in progs if r["mission"] == "Défense"]
    d = collections.defaultdict(int)
    for r in defn:
        d[(r["type_credit"], int(r["annee"]))] += int(r["montant"])
    exp["defense"] = dict(d)
    exp["rows"] = rows
    return exp


def fmt_mde(n):
    """Format UI fmtEUR pour >= 1e9 : X,X Md€ (fr, 1 décimale max)."""
    v = n / 1e9
    s = f"{v:.1f}".replace(".", ",")
    return s.rstrip("0").rstrip(",") if s.endswith(",0") else s


def fmt_pct(p):
    s = f"{abs(p):.1f}".replace(".", ",")
    return ("+" if p > 0 else "−" if p < 0 else "") + s + " %"


# ---------------------------------------------------------------- Partie B
def run_ui_checks(port, exp):
    proc = subprocess.Popen(
        ["chromium-browser", "--headless", "--no-sandbox", "--disable-gpu",
         "--remote-allow-origins=*", f"--remote-debugging-port={port + 100}",
         f"http://localhost:{port}/"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(2)
    try:
        targets = json.load(urllib.request.urlopen(
            f"http://localhost:{port + 100}/json"))
        page = next(t for t in targets if t["type"] == "page")
        import websocket
        ws = websocket.create_connection(
            page["webSocketDebuggerUrl"], timeout=15)
    except Exception as e:
        check("chromium CDP accessible", False, str(e))
        proc.terminate()
        return

    _id = [0]

    def eval_js(expr, wait_for_value=True, tries=40, delay=1.0):
        """Évalue une expression JS; si wait_for_value, retente tant que
        le résultat est vide (chargement WASM / re-render React)."""
        for _ in range(tries if wait_for_value else 1):
            _id[0] += 1
            myid = _id[0]
            ws.send(json.dumps({"id": myid, "method": "Runtime.evaluate",
                                "params": {"expression": expr,
                                           "returnByValue": True}}))
            deadline = time.time() + 10
            while time.time() < deadline:
                r = json.loads(ws.recv())
                if r.get("id") == myid:
                    v = r.get("result", {}).get("result", {}).get("value")
                    if v or not wait_for_value:
                        return v
                    break
            time.sleep(delay)
        return None

    def type_text(sel, text):
        return eval_js(
            f"(() => {{ const i = document.querySelector('{sel}');"
            f" const s = Object.getOwnPropertyDescriptor("
            f"HTMLInputElement.prototype, 'value').set;"
            f" s.call(i, {json.dumps(text)});"
            f" i.dispatchEvent(new Event('input', {{bubbles: true}}));"
            f" return true; }})()", wait_for_value=False)

    def click_first(sel):
        return eval_js(
            f"(() => {{ const e = document.querySelector('{sel}');"
            f" if (!e) return null; e.dispatchEvent("
            f"new MouseEvent('click', {{bubbles: true}})); return true; }})()",
            wait_for_value=False)

    # -- 1. chargement
    check("pas d'écran d'erreur",
          not eval_js("document.body.innerText.includes('Erreur au lancement')"))
    kpi = eval_js("document.querySelector('.kpis')?.innerText") or ""
    check("KPI affichés", bool(kpi))

    cp = exp["CP"]
    check("KPI total CP 2027", fmt_mde(cp["t27"]) + " Md€" in kpi,
          f"attendu {fmt_mde(cp['t27'])} Md€")
    check("KPI LFI 2026", fmt_mde(cp["t26"]) + " Md€" in kpi,
          f"attendu {fmt_mde(cp['t26'])} Md€")
    delta = cp["t27"] - cp["t26"]
    check("KPI delta", fmt_mde(abs(delta)) + " Md€" in kpi)
    evol = (cp["t27"] - cp["t26"]) / cp["t26"] * 100
    check("KPI évolution %", fmt_pct(evol) in kpi.replace("−", "−"),
          f"attendu {fmt_pct(evol)}")
    check("KPI top poste", cp["top_name"] in kpi, cp["top_name"])

    # -- 2. treemap & barres & tableau
    check("treemap : une cellule par mission",
          eval_js("document.querySelectorAll('.tm-cell').length") == cp["n"],
          f"{eval_js('document.querySelectorAll(\".tm-cell\").length')} / {cp['n']}")
    check("barres : top 14 × 2 séries",
          eval_js("document.querySelectorAll('.recharts-bar-rectangle').length")
          == 28)
    n_rows = eval_js("document.querySelectorAll('table.tbl tbody tr').length")
    check("tableau : missions + ligne total",
          n_rows == cp["n"] + 1, f"{n_rows} / {cp['n'] + 1}")
    first_row = eval_js(
        "document.querySelector('table.tbl tbody tr')?.innerText") or ""
    check("1ʳᵉ ligne = mission top", cp["top_name"] in first_row)
    check("1ʳᵉ ligne : PLF 2027 correct",
          fmt_mde(cp["top27"]) + " Md€" in first_row,
          f"attendu {fmt_mde(cp['top27'])} Md€")
    check("note de lecture « 54 Md€ » présente",
          bool(eval_js("document.querySelector('.note')?.innerText.includes('54 Md€')")))

    # -- 3. tri du tableau (PLF 2027 = 3ᵈ colonne : Mission | LFI 2026 | PLF 2027 | Événement | Part)
    click_first("table.tbl th:nth-child(3)")  # PLF 2027 -> bascule asc
    time.sleep(0.4)
    first_asc = eval_js(
        "document.querySelector('table.tbl tbody tr')?.innerText") or ""
    check("tri ascendant : 1ʳᵉ ligne = plus petite mission",
          exp["CP"]["min_name"] in first_asc, exp["CP"]["min_name"])
    click_first("table.tbl th:nth-child(3)")  # retour desc
    time.sleep(0.4)

    # -- 4. bascule AE
    click_first(".seg button:nth-child(2)")
    ae = exp["AE"]
    kpi_ae = eval_js("document.querySelector('.kpis')?.innerText",
                     tries=20) or ""
    check("bascule AE : total AE 2027",
          fmt_mde(ae["t27"]) + " Md€" in kpi_ae,
          f"attendu {fmt_mde(ae['t27'])} Md€")
    check("bascule AE : LFI 2026",
          fmt_mde(ae["t26"]) + " Md€" in kpi_ae)
    hint = (eval_js("[...document.querySelectorAll('.hint')].map(e => e.innerText).join(' | ')")
            or "")
    check("hint barres suit la bascule", "AE 2027" in hint, hint[:80])
    click_first(".seg button:nth-child(1)")  # retour CP
    eval_js("document.querySelector('.kpis')?.innerText", tries=20)

    # -- 5. recherche
    type_text(".search-input input", "Défense")
    time.sleep(0.5)
    n_rows = eval_js("document.querySelectorAll('table.tbl tbody tr').length",
                     tries=20)
    check("recherche « Défense » : 1 mission + total", n_rows == 2,
          f"{n_rows} lignes")
    d27 = exp["defense"][("CP", 2027)]
    check("KPI filtrés = Défense CP 2027",
          fmt_mde(d27) + " Md€" in (eval_js("document.querySelector('.kpis')?.innerText") or ""),
          f"attendu {fmt_mde(d27)} Md€")
    type_text(".search-input input", "zzzz-aucune")
    time.sleep(0.5)
    check("recherche sans résultat : message vide",
          bool(eval_js("document.querySelector('.empty')?.innerText.includes('Aucune mission')",
                       tries=10)))
    type_text(".search-input input", "")
    time.sleep(0.5)
    eval_js("document.querySelector('.kpis')?.innerText", tries=20)

    # -- 6. drill-down via clic treemap
    click_first(".tm-cell")
    time.sleep(0.8)
    body = eval_js("document.body.innerText", tries=20) or ""
    check("clic treemap : vue programmes",
          "Programmes —" in body and "Remboursements" in body)
    check("chip mission sélectionnée affichée",
          "Remboursements" in (eval_js("document.querySelector('.chip')?.innerText") or ""))
    check("vue programmes : nom de la mission dans le titre",
          f"Programmes — {exp['CP']['top_name']}"[:40] in body)
    n_prog = eval_js("document.querySelectorAll('table.tbl tbody tr').length")
    check("nombre de programmes de la mission top",
          n_prog == len(exp["top_programs"]),
          f"{n_prog} / {len(exp['top_programs'])}")
    # -- 7. retour
    click_first(".back-btn")
    time.sleep(0.6)
    n_rows = eval_js("document.querySelectorAll('table.tbl tbody tr').length",
                     tries=20)
    check("retour : missions + total", n_rows == cp["n"] + 1, f"{n_rows} lignes")
    # -- 8. drill-down via clic ligne tableau (une autre mission)
    click_first("table.tbl tbody tr:nth-child(2)")
    time.sleep(0.8)
    check("clic ligne : vue programmes",
          "Programmes —" in (eval_js("document.body.innerText", tries=20) or ""))
    click_first(".back-btn")
    time.sleep(0.6)

    ws.close()
    proc.terminate()


# ---------------------------------------------------------------- Partie C
def data_integrity_checks(rows):
    by_m = collections.defaultdict(int)
    by_p = collections.defaultdict(int)
    for r in rows:
        k = r["mission"]
        if r["programme"] == "(total mission)":
            by_m[k] += int(r["montant"])
        else:
            by_p[k] += int(r["montant"])
    frags = [k for k in by_p if k not in by_m]
    warn("3 noms de missions tronqués (continuations multi-lignes)", "")
    for f in frags:
        warn(f"fragment «{f}»", "programmes attribués au nom tronqué")
    lone = [k for k in by_m if k not in by_p]
    for l in lone:
        warn(f"mission «{l}» : ligne total sans programme",
             "absente du dashboard")
    gap = sum(by_m.get(k, 0) - by_p.get(k, 0) for k in set(by_m) | set(by_p)
              if by_m.get(k, 0) != by_p.get(k, 0) and k not in frags and k not in lone)
    warn("lignes programmes manquantes vs totaux du PDF",
         f"≈ {gap / 1e9:.1f} Md€ sur ~1 250 Md€ de lignes")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8901)
    args = ap.parse_args()

    print("== Partie A : valeurs attendues (agrégation Python indépendante) ==")
    exp = expected_from_csv(f"{REPO}/data/staging/fact_credits.csv")
    for ct in ("CP", "AE"):
        e = exp[ct]
        print(f"  {ct}: {e['n']} missions | 2026={e['t26']/1e9:.1f} Md€ | "
              f"2027={e['t27']/1e9:.1f} Md€ | top={e['top_name']} "
              f"({e['top27']/1e9:.1f} Md€)")

    print("\n== Partie C : intégrité des données (avertissements) ==")
    data_integrity_checks(exp["rows"])

    print(f"\n== Partie B : UI headless (http://localhost:{args.port}) ==")
    server = subprocess.Popen(
        ["python3", "-m", "http.server", str(args.port),
         "--directory", f"{REPO}/sqlrooms-dashboard/dist"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    try:
        run_ui_checks(args.port, exp)
    finally:
        server.terminate()

    print(f"\n== RÉSULTAT : {'ÉCHEC' if FAILURES else 'SUCCÈS'} "
          f"({len(FAILURES)} échec(s)) ==")
    for f in FAILURES:
        print(f"  ✗ {f}")
    sys.exit(1 if FAILURES else 0)


if __name__ == "__main__":
    main()