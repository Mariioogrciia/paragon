# Paragon en Google Cloud Run

Mudanza desde Vercel (10 nov 2026): el plan gratis de Vercel da 4 h de CPU al
mes y avisó de que pausaba la cuenta. Cloud Run da unas 50 h de CPU y 2
millones de peticiones al mes gratis, escala a cero sin visitas y es Node de
verdad (`next start` en modo standalone).

Lo que hay en el repo:

- `Dockerfile` y `.dockerignore`: la imagen (Next.js `output: "standalone"`).
- `.github/workflows/desplegar-cloud-run.yml`: cada push a `master` construye,
  sube la imagen a Artifact Registry y despliega. No hace nada hasta que exista
  la variable `GCP_PROYECTO` en GitHub.
- `scripts/cloudrun/entorno.mjs`: convierte el `.env` de producción en lo que
  piden la compilación y Cloud Run (quita las variables de Vercel).
- `.github/workflows/sync-frecuente.yml`: los crons (sincronizar cada 4 h y la
  foto de las ligas los lunes) llaman a `SITE_URL`, así que siguen funcionando
  después del cambio de dominio sin tocar nada.

## Pasos (una sola vez)

### 1. Cuenta y proyecto de Google Cloud

1. Entra en <https://console.cloud.google.com>, crea un proyecto (por ejemplo
   `paragon`) y apunta su **ID** (puede ser `paragon-123456`).
2. Activa la facturación con tu tarjeta (*Facturación → Vincular cuenta*). No
   cobra nada mientras no pases de la capa gratuita.
3. **Alerta de presupuesto**: *Facturación → Presupuestos y alertas → Crear*,
   1 € al mes, avisos al 50 %, 90 % y 100 %. Así te enteras antes de pagar nada.

### 2. Preparar Cloud Run (en Cloud Shell)

Abre Cloud Shell (el icono `>_` arriba a la derecha de la consola; no hay que
instalar nada) y pega esto cambiando el ID del proyecto:

```bash
PROYECTO=paragon-123456   # ← el tuyo
gcloud config set project $PROYECTO
gcloud services enable run.googleapis.com artifactregistry.googleapis.com iam.googleapis.com
gcloud artifacts repositories create paragon --repository-format=docker --location=europe-west1
gcloud iam service-accounts create github-despliegue --display-name="GitHub despliega Paragon"
SA=github-despliegue@$PROYECTO.iam.gserviceaccount.com
for ROL in roles/run.admin roles/artifactregistry.repoAdmin roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding $PROYECTO --member=serviceAccount:$SA --role=$ROL --condition=None
done
gcloud iam service-accounts keys create clave.json --iam-account=$SA
cat clave.json
```

Copia **todo** lo que imprime el último comando (el JSON). Después bórralo:
`rm clave.json`.

### 3. Las variables de producción

Son las mismas que tiene Vercel. Sácalas con la CLI de Vercel (en tu
ordenador, dentro del repo):

```bash
npx vercel link            # elige el proyecto paragon
npx vercel env pull .env.produccion --environment=production
```

Abre `.env.produccion` y **añade al final** estas dos líneas:

```
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="<pega aquí la salida de: openssl rand -base64 32>"
AUTH_TRUST_HOST="true"
```

(La primera tiene que ser siempre la misma: si cambia, los formularios
abiertos en una pestaña vieja fallan tras cada despliegue.)

Ojo: las variables marcadas como *Sensitive* en Vercel salen vacías en
`env pull` (Vercel no deja leerlas). Si alguna sale `=""`, copia su valor de
donde lo sacaste (Google Cloud, Discord Developers, Steam…).

No subas ese archivo a git (ya lo ignora `.gitignore`).

### 4. GitHub

En el repo: *Settings → Secrets and variables → Actions*:

- Pestaña **Variables** → *New repository variable*: `GCP_PROYECTO` = el ID del proyecto.
- Pestaña **Secrets** → *New repository secret*:
  - `GCP_CLAVE` = el JSON del paso 2.
  - `ENV_PRODUCCION` = el contenido entero de `.env.produccion`.

Luego *Actions → Desplegar en Cloud Run → Run workflow* (rama `master`). Tarda
unos 6-8 minutos. Al final, en el paso «Desplegar», sale la dirección del
servicio: `https://paragon-xxxxx.europe-west1.run.app`. Ábrela y comprueba que
cargan la portada y alguna ficha. El inicio de sesión todavía no irá ahí (las
vueltas de Google/Discord van a `www.paragontrophies.com`, que sigue en
Vercel hasta el paso 5).

### 5. El dominio

1. Mapear el dominio en Cloud Run (Cloud Shell):

   ```bash
   gcloud beta run domain-mappings create --service paragon \
     --domain www.paragontrophies.com --region europe-west1
   ```

   Si pide verificar el dominio, la propiedad ya está verificada en Search
   Console (`public/google31a4958226958171.html`) con tu misma cuenta de Google.
2. En **Cloudflare → DNS**, cambia el registro de `www`:
   `CNAME www → ghs.googlehosted.com`, con la **nube gris** (solo DNS). Con la
   nube naranja Google no puede emitir el certificado.
3. El dominio sin `www` (`paragontrophies.com`) lo redirigía Vercel. Ahora,
   en Cloudflare: *Rules → Redirect Rules → Create*: cuando el host sea
   `paragontrophies.com`, redirección 301 a
   `https://www.paragontrophies.com${uri}` (o la plantilla «Redirect from root
   to WWW»). Ese registro sí con la nube naranja.
4. El certificado tarda entre 15 minutos y un par de horas. Mientras, la web
   puede dar error de certificado. Se ve el estado con
   `gcloud beta run domain-mappings describe --domain www.paragontrophies.com --region europe-west1`.

### 6. Despedirse de Vercel

Cuando `www.paragontrophies.com` ya salga desde Cloud Run (inicio de sesión
incluido), en Vercel quita el dominio del proyecto y pausa el proyecto. No lo
borres hasta pasadas unas semanas, por si hay que volver.

Las apps (Android/iOS), la extensión, el bot de Discord, Telegram y Ko-fi usan
`www.paragontrophies.com`, así que siguen funcionando sin cambios. Lo que use
todavía `platinos-nine.vercel.app` (versiones muy viejas de la app) dejará de
ir cuando se pause Vercel.

## Notas

- **Arranque en frío**: sin visitas el servicio se apaga, y la primera
  petición tras un rato tarda 2-4 s más. Es el precio de que sea gratis
  (`--min-instances 0`).
- **Límites gratis al mes** (región europe-west1): 2 millones de peticiones,
  180.000 vCPU-segundo y 360.000 GiB-segundo. El servicio va con 1 vCPU y
  1 GiB y solo cuenta mientras atiende peticiones.
- **Artifact Registry** da 0,5 GB gratis; el despliegue borra las imágenes
  viejas y deja las dos últimas.
- **Cambiar una variable**: edita el secret `ENV_PRODUCCION` en GitHub y
  vuelve a lanzar «Desplegar en Cloud Run».
