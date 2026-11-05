"""Euclide Orientamento: frontend originale e backend portabile SQLite."""
import base64
import csv
import hmac
import html
import io
import json
import os
from pathlib import Path
import re
import sqlite3
import time
from datetime import datetime
from zoneinfo import ZoneInfo
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit
import mimetypes

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
DATA = Path(os.environ.get('DATA_DIR', '/data'))
DB = DATA / 'orientamento.sqlite3'
ORIGIN = os.environ.get('PUBLIC_ORIGIN', 'http://localhost:8080').rstrip('/')
USERNAME = os.environ.get('ADMIN_USER', 'admin')
PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
FIELDS = ['id', 'student_name', 'student_surname', 'parent_name', 'email', 'phone', 'middle_school', 'course', 'created_at', 'privacy_version']
COURSES = {'info': 'Informatica', 'elettro': 'Elettrotecnica', 'mecca': 'Meccatronica', 'grafica': 'Grafica', 'indeciso': 'Da scegliere'}
UUID4 = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', re.I)

def connect():
    db = sqlite3.connect(DB, timeout=10)
    db.row_factory = sqlite3.Row
    return db

def initialize():
    if len(PASSWORD) < 20 or ':' in USERNAME or not USERNAME:
        raise SystemExit('Impostare ADMIN_PASSWORD (almeno 20 caratteri) e ADMIN_USER valido.')
    u = urlsplit(ORIGIN)
    if u.scheme not in ('http', 'https') or not u.netloc or u.path or u.query or u.fragment:
        raise SystemExit('PUBLIC_ORIGIN deve essere una origine HTTP/HTTPS senza percorso.')
    DATA.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('''CREATE TABLE IF NOT EXISTS registrations (
            id TEXT PRIMARY KEY, student_name TEXT NOT NULL, student_surname TEXT NOT NULL,
            parent_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
            middle_school TEXT NOT NULL DEFAULT '', course TEXT NOT NULL, created_at INTEGER NOT NULL,
            privacy_version TEXT NOT NULL)''')
        db.execute('CREATE INDEX IF NOT EXISTS registrations_email_date ON registrations(email, created_at)')

class Handler(BaseHTTPRequestHandler):
    server_version = 'Euclide'

    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def log_message(self, *_):
        # I log non contengono nomi, email, password, payload o percorsi richiesti.
        pass

    def respond(self, body, status=200, kind='text/html; charset=utf-8', extra=None, head=False):
        if isinstance(body, str):
            body = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def json(self, body, status=200):
        self.respond(json.dumps(body, ensure_ascii=False), status, 'application/json; charset=utf-8')

    def authorized(self):
        try:
            method, encoded = self.headers.get('Authorization', '').split(' ', 1)
            user, password = base64.b64decode(encoded, validate=True).decode('utf-8').split(':', 1)
            valid_user = hmac.compare_digest(user.encode(), USERNAME.encode())
            valid_pass = hmac.compare_digest(password.encode(), PASSWORD.encode())
            if method.lower() == 'basic' and valid_user and valid_pass:
                return True
        except (ValueError, UnicodeError):
            pass
        self.respond('Accesso riservato al gestore.', 401, extra={'WWW-Authenticate': 'Basic realm="Euclide amministrazione", charset="UTF-8"'})
        return False

    def do_HEAD(self):
        self.get(head=True)

    def do_GET(self):
        self.get()

    def get(self, head=False):
        path = urlsplit(self.path).path
        if path == '/healthz':
            with connect() as db:
                db.execute('SELECT 1').fetchone()
            return self.respond('ok', kind='text/plain', head=head)
        if path in ('/admin', '/admin/', '/api/admin/export'):
            if not self.authorized():
                return
            with connect() as db:
                limit = ' LIMIT 500' if path != '/api/admin/export' else ''
                rows = db.execute('SELECT * FROM registrations ORDER BY created_at DESC' + limit).fetchall()
            if path == '/api/admin/export':
                buf = io.StringIO(newline='')
                writer = csv.writer(buf, delimiter=';', quoting=csv.QUOTE_ALL)
                writer.writerow(FIELDS)
                for row in rows:
                    values = []
                    for key in FIELDS:
                        v = str(row[key])
                        if key == 'created_at':
                            v = datetime.fromtimestamp(row[key]/1000, ZoneInfo('Europe/Rome')).isoformat()
                        if v.lstrip().startswith(('=', '+', '-', '@', '\t', '\r', '\n')):
                            v = "'" + v
                        values.append(v)
                    writer.writerow(values)
                return self.respond('\ufeff' + buf.getvalue(), kind='text/csv; charset=utf-8', extra={'Content-Disposition': 'attachment; filename="preiscrizioni-euclide.csv"'}, head=head)
            esc = lambda value: html.escape(str(value), quote=True)
            body = ''.join('<tr>' + ''.join('<td>' + esc(v) + '</td>' for v in [
                datetime.fromtimestamp(r['created_at']/1000, ZoneInfo('Europe/Rome')).strftime('%d/%m/%Y %H:%M'),
                r['student_name'] + ' ' + r['student_surname'], r['parent_name'], r['email'],
                r['phone'], r['middle_school'], COURSES.get(r['course'], r['course'])]) + '</tr>' for r in rows)
            return self.respond('''<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Euclide · Richieste orientamento</title><link rel="stylesheet" href="/style.css"><style>body{padding:35px}table{width:100%;border-collapse:collapse;font-size:13px;background:white}td,th{text-align:left;padding:14px;border-bottom:1px solid #ddd}.table{overflow:auto}h1{font-size:42px}.actions{display:flex;gap:20px;align-items:center;margin:25px 0}</style><h1>Richieste di orientamento</h1>'''
                + f'<p>Ultime {len(rows)} richieste · accesso riservato al gestore.</p><div class="actions"><a href="/">← Torna alla piattaforma</a><a class="primary" href="/api/admin/export">Scarica tutte in CSV ↓</a></div><div class="table"><table><thead><tr><th>Data</th><th>Studente</th><th>Genitore / tutore</th><th>Email</th><th>Telefono</th><th>Scuola media</th><th>Interesse</th></tr></thead><tbody>{body}</tbody></table></div><p>Le richieste non sono iscrizioni ufficiali. Nessuna email viene inviata automaticamente.</p></html>', head=head)
        # Vengono pubblicati solo file dentro public, mai runtime, database o sorgenti originali.
        target = (PUBLIC / unquote(path).lstrip('/')).resolve()
        if path == '/':
            target = PUBLIC / 'index.html'
        if not target.is_relative_to(PUBLIC.resolve()) or not target.is_file():
            return self.respond('Pagina non trovata.', 404, head=head)
        kind = mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
        self.respond(target.read_bytes(), kind=kind, head=head)

    def do_POST(self):
        if urlsplit(self.path).path != '/api/preregistrations':
            return self.json({'error': 'Risorsa non trovata.'}, 404)
        if self.headers.get('Origin') != ORIGIN:
            return self.json({'error': 'Richiesta non autorizzata.'}, 403)
        if self.headers.get('Content-Type', '').split(';')[0].strip() != 'application/json':
            return self.json({'error': 'Formato non valido.'}, 415)
        if self.headers.get('Transfer-Encoding'):
            return self.json({'error': 'Formato non valido.'}, 400)
        try:
            length = int(self.headers.get('Content-Length', '-1'))
        except ValueError:
            length = -1
        if length < 0 or length > 8000:
            return self.json({'error': 'Dimensione richiesta non valida.'}, 413)
        try:
            b = json.loads(self.rfile.read(length))
        except (ValueError, UnicodeError):
            return self.json({'error': 'Dati non validi.'}, 400)
        if not isinstance(b, dict):
            return self.json({'error': 'Dati non validi.'}, 400)
        def val(key, maximum):
            value = b.get(key)
            return value.strip()[:maximum] if isinstance(value, str) else ''
        ident, name, surname, parent = val('id', 36), val('studentName', 80), val('studentSurname', 80), val('parentName', 120)
        email, phone, school, course = val('email', 160).lower(), val('phone', 30), val('middleSchool', 160), val('course', 30)
        if not (UUID4.fullmatch(ident) and name and surname and parent and re.fullmatch(r'\S+@\S+\.\S+', email) and course in COURSES and b.get('consent') is True and not val('website', 200)):
            return self.json({'error': 'Controlla i campi obbligatori e la presa visione dell’informativa.'}, 400)
        try:
            with connect() as db:
                db.execute('BEGIN IMMEDIATE')
                existing = db.execute('SELECT email FROM registrations WHERE id = ?', (ident,)).fetchone()
                if existing:
                    if existing['email'] != email:
                        return self.json({'error': 'Riferimento richiesta già utilizzato.'}, 409)
                    return self.json({'ok': True, 'id': ident})
                now = int(time.time()*1000)
                n = db.execute('SELECT COUNT(*) FROM registrations WHERE email = ? AND created_at > ?', (email, now-3600000)).fetchone()[0]
                if n >= 3:
                    return self.json({'error': 'Hai già inviato più richieste. Riprova più tardi.'}, 429)
                db.execute('INSERT INTO registrations VALUES (?,?,?,?,?,?,?,?,?,?)', (ident, name, surname, parent, email, phone, school, course, now, '2026-10-09-v1'))
        except sqlite3.Error:
            return self.json({'error': 'Non è stato possibile salvare. Riprova.'}, 500)
        self.json({'ok': True, 'id': ident}, 201)

if __name__ == '__main__':
    initialize()
    server = ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PORT', '8080'))), Handler)
    server.daemon_threads = True
    print('Euclide Orientamento avviato.', flush=True)
    server.serve_forever()
