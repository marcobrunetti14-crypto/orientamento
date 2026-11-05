# Euclide Orientamento — sorgenti e Docker

Esportazione del progetto originale «Euclide — Esplora il tuo futuro», versione Sites 21, recuperata il 5 novembre 2026. Commit originale: df93788afcecb459c4456e05b6aa4c93852c68c9.

## Avvio

Prerequisiti: Docker Engine e Docker Compose (comando `docker compose`).

Estrai lo ZIP, apri un terminale nella cartella `euclide-orientamento-docker`, poi:

```sh
sh configura.sh
docker compose up -d --build
docker compose ps
```

Apri http://localhost:8080. Gestione richieste: http://localhost:8080/admin, utente `admin` e password generata nel file `.env`.

La password non è predefinita e il programma rifiuta password inferiori a 20 caratteri. `configura.sh` conserva un eventuale `.env` esistente. In alternativa copia `.env.example` in `.env` e imposta una password casuale.

## Server e dominio HTTPS

Nel file `.env` imposta `PUBLIC_ORIGIN` all'indirizzo esatto del sito, per esempio `https://orientamento.tuodominio.it`, senza slash finale o sottocartella. È necessario per accettare il modulo di preiscrizione. Pubblica il sito alla radice del dominio.

Di default la porta è raggiungibile solo dal server (`127.0.0.1`): collega il reverse proxy HTTPS già presente alla porta 8080. Se il proxy è in un altro container, usa una rete Docker condivisa oppure configura esplicitamente il collegamento all'host. Per raggiungere direttamente la porta dalla rete, imposta `BIND_IP=0.0.0.0` e limita gli accessi con il firewall.

Per uso pubblico configura HTTPS sul reverse proxy. Il login amministratore usa HTTP Basic: le credenziali devono viaggiare su HTTPS. Anche le funzioni browser come `crypto.randomUUID` e clipboard richiedono HTTPS, salvo l'eccezione di localhost. Il container espone HTTP; non emette certificati TLS.

Dopo una modifica a `.env`:

```sh
docker compose up -d
```

## Contenuto

- `public/`: HTML, CSS, JavaScript, libreria Three.js e logo originali. L'HTML è sincronizzato con il sorgente originale `app/site-content.ts`.
- `runtime/server.py`: backend portabile Python senza dipendenze esterne, con SQLite, modulo richieste, pannello `/admin`, esportazione CSV e health check.
- `Dockerfile`, `compose.yaml`, `.env.example`, `configura.sh`: avvio autonomo.
- `original-sites/`: sorgente integrale del progetto Sites recuperato, senza Git, credenziali o dati utente. È conservato per riferimento e manutenzione e non viene copiato nell'immagine Docker.
- `tests/`: verifiche automatiche del backend portabile.

La versione Docker sostituisce Cloudflare D1 con SQLite e l'accesso ChatGPT con credenziali amministratore. Non richiede Node, servizi OpenAI o Cloudflare. Il database viene creato automaticamente nel volume Docker `dati` e sopravvive alla ricreazione del container. I dati delle richieste eventualmente presenti su Sites NON sono inclusi nell'esportazione: prima della migrazione scaricali da `/api/admin/export` sul sito originale. Il CSV è un archivio consultabile; questo pacchetto non include importazione automatica delle vecchie richieste.

Il sito conserva quiz, mini-attività, quattro isole, percorso verso la scuola, pannello e modulo originali. Il tour dell'Industriale resta il collegamento Realsee configurato in `public/tour-config.js`; gli altri tour non sono stati inventati. Google Maps, Realsee, link istituzionali ed eventuali altre risorse esterne richiedono Internet e restano dipendenti dai rispettivi fornitori. Non è un'esportazione offline del tour Realsee. Il testo e i contatti dell'informativa originale sono conservati in `public/registration.js`: aggiornali se cambia il gestore.

I risultati/passaporti eventualmente salvati in localStorage restano sul browser e sull'origine dove sono stati creati; non migrano automaticamente al nuovo dominio.

## Manutenzione e backup

```sh
# Stato e log di avvio
docker compose ps
docker compose logs --tail=50 web

# Aggiornamento dopo modifiche ai sorgenti
docker compose up -d --build

# Arresto, conservando i dati
docker compose down
```

Non usare `docker compose down -v` se vuoi conservare le richieste: elimina il volume.

Backup consistente del database anche a servizio attivo:

```sh
docker compose exec -T web python -c "import sqlite3; s=sqlite3.connect('/data/orientamento.sqlite3'); d=sqlite3.connect('/data/backup.sqlite3'); s.backup(d); d.close(); s.close()"
docker compose cp web:/data/backup.sqlite3 ./orientamento-backup.sqlite3
```

Proteggi il backup: contiene dati personali. Per ripristinare, ferma il servizio (`docker compose stop web`), copia il backup con `docker compose cp ./orientamento-backup.sqlite3 web:/data/orientamento.sqlite3`, rimuovi eventuali file `orientamento.sqlite3-wal` e `orientamento.sqlite3-shm` dal volume usando un container di manutenzione e verifica che proprietario/gruppo del database siano `10001:10001` prima di riavviare. Fai una copia del volume prima del ripristino.

## Verifiche

Eseguire `python3 -m unittest discover -s tests -v` dalla cartella principale. Il test utilizza soltanto dati fittizi e un database temporaneo.

Il frontend originale non è stato ridisegnato. L'ambiente di preparazione non dispone di Docker: il build e l'avvio del container non sono stati eseguiti qui. Le verifiche del backend sono riportate in `VERIFICA.txt`. I servizi esterni e l'esperienza VR non sono stati collaudati in questa esportazione.
