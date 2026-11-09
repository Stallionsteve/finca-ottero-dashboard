# Finca Ottero app

The Finca Ottero smart-home dashboard, served by Home Assistant from `/config/www/finca-ottero/`.
Contains only the app's design and code — no settings, addresses or keys. It signs in with
Home Assistant's own login page.

Install or update (Home Assistant **Terminal** add-on):

```sh
mkdir -p /config/www/finca-ottero && curl -sL https://codeload.github.com/Stallionsteve/finca-ottero-dashboard/tar.gz/main | tar xz --strip-components=1 -C /config/www/finca-ottero && ls /config/www/finca-ottero
```

Then open `http://homeassistant.local:8123/local/finca-ottero/index.html`.

`vendor/haws.umd.js` is Home Assistant's home-assistant-js-websocket 9.4.0 (Apache-2.0, see `vendor/haws.LICENSE`).
