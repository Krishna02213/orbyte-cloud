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
