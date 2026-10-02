# Benjamin deze week

Privé 3D-zwangerschapsvolger (Vite + Three.js, geen backend). Uitgerekende
datum, naam en alle teksten staan in `src/weeks.js`.

## Netlify (eenmalig)

1. Netlify → *Add new site* → *Import an existing project* → deze repo.
2. Branch `main`, **Base directory `zwangerschap`**. Build command en publish
   directory komen uit `zwangerschap/netlify.toml`.
3. *Site configuration* → *Change site name*: kies iets dat niet te raden is,
   bijvoorbeeld `benjamin-` plus een paar willekeurige tekens. Die naam is de
   geheime link. Zoekmachines worden geweerd (`X-Robots-Tag`, `robots.txt`).

## 3D-modellen

- Eén GLB per stadium in `public/models/stage-XX.glb` (stadia: zie `STAGES`
  in `src/weeks.js`). Ontbreekt een bestand, dan toont de app een gestileerde
  vervanger (`src/procedural.js`).
- Modellen komen uit Higgsfield (text-to-3D). Comprimeer ze voor mobiel:
  `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024`.
- Hotspot-posities per stadium in `STAGE_HOTSPOT_POS`. Open de site met
  `?edit=1` en tik op het model om de coördinaten af te lezen.
