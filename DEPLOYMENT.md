# Server deployment

Website: http://13.206.108.114

The project is deployed at `/home/ubuntu/orbyte-cloud-main` on the Ubuntu server.
Node.js runs the production build on `127.0.0.1:3000`. Nginx serves public HTTP
on port 80. Both services start automatically on boot.

## Connect

```sh
ssh -i ~/Downloads/test.pem ubuntu@13.206.108.114
```

## Admin dashboard

The bundled admin page has no login, so Nginx blocks public access to `/admin`.
Run this command on your Mac and leave it open:

```sh
ssh -i ~/Downloads/test.pem -N -L 3001:127.0.0.1:3000 ubuntu@13.206.108.114
```

Then open http://127.0.0.1:3001/admin on your Mac.

## Manage the running app

Run these commands after connecting to the server:

```sh
sudo systemctl status orbyte-cloud
sudo journalctl -u orbyte-cloud -n 100 --no-pager
sudo systemctl restart orbyte-cloud
```

After uploading source updates, rebuild before restarting:

```sh
cd /home/ubuntu/orbyte-cloud-main
npm ci --no-audit --no-fund
npm run lint
NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=640 npm run build
sudo systemctl restart orbyte-cloud
```

Consultation data is stored separately at `/var/lib/orbyte-cloud/orbyte.db`.
Preserve this directory during future deployments. The service definition is
`/etc/systemd/system/orbyte-cloud.service`; the Nginx configuration is
`/etc/nginx/sites-available/default`.

HTTPS and a custom domain have not been configured.

## GitHub Actions CI

`.github/workflows/ci.yml` runs on pull requests to `main`, pushes to `main`,
and manual runs. It installs locked dependencies, runs ESLint, builds a
standalone release, and starts that release to check the homepage, static
assets, form validation, SQLite writes, and admin rendering.

Pushes to `main` also save an `orbyte-release-<commit SHA>` artifact for seven
days. It contains `orbyte-release.tar.gz`, including the standalone server,
runtime dependencies, public files, static assets, and a `REVISION` file.
The CI database lives outside the release directory and is not deployed.
The workflow currently performs CI only; automatic EC2 deployment is the next
setup step. No SSH credentials are required for this workflow.

Standalone packages start with `HOSTNAME=127.0.0.1 PORT=3000 node server.js`
from the extracted release directory, with `ORBYTE_DATA_DIR` set to the
persistent database directory. The existing live service is unchanged until
the deployment step is configured.
