# Deployment

Website: http://13.206.108.114

## Automatic updates

1. Make a feature branch, commit your changes, and push it to GitHub.
2. Open a pull request to `main`. GitHub Actions installs locked dependencies,
   runs ESLint, checks the deployment script, builds the production app, and
   tests its homepage, static assets, form validation, PostgreSQL writes, and admin.
3. Merge into `main`. The same checks run on the merged commit. If they pass,
   Actions uploads that exact tested package to EC2 and deploys it automatically.
4. Watch the build and deployment in the repository's **Actions** tab.

You can also use **Actions → CI/CD → Run workflow** on `main` to redeploy.
Pull requests and manual runs from other branches cannot deploy to production.
The workflow is `.github/workflows/ci.yml`. It builds on GitHub, so EC2 does
not need to run `npm install` or `npm run build` for each update.
PostgreSQL deployment additionally requires the repository Actions variable
`ORBYTE_RDS_READY=true`, set after the initial migration preparations.

## How deployment works

The `production` GitHub environment allows deployments from `main` and holds
four secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, and `SSH_KNOWN_HOSTS`.
The key belongs to a dedicated `orbyte-deploy` account. SSH forces that key to
run `/usr/local/bin/orbyte-deploy`; it cannot open a shell or forward ports.
Its only sudo permission is restarting `orbyte-cloud`.

Each release lives in `/opt/orbyte-cloud/releases`. The server checks the
archive checksum and commit, starts it on port 3002 with a temporary database,
and checks its homepage, favicon, and database-backed admin page. The separate
preflight database is `orbyte_preflight` on RDS, configured by
`/etc/orbyte-cloud/preflight.json`. It checks access to production, then switches
`/opt/orbyte-cloud/current`, restarts the app on port 3000, and checks the live
process and website. If activation fails or is interrupted, it restores the
previous release and restarts the app. Deployments are serialized.

Nginx serves public HTTP on port 80 and blocks `/admin`. Both Nginx and the
app start on boot. Switching a release restarts the app and can cause a brief
interruption. The workflow also checks the public homepage and admin block.
An external network failure after activation marks the job failed; automatic
rollback is triggered by the server's activation checks.

The server retains three recent release directories plus any protected
current/previous releases. GitHub retains deployment artifacts for seven days.
Production records live in the RDS PostgreSQL database `orbyte`. Runtime
connection settings are in `/etc/orbyte-cloud/database.json`, readable only by
root and the trusted application group; TLS validates the AWS RDS certificate.
The build runner does not receive production database credentials.

Database backups are disabled at the user's request. This helper does not
create database snapshots, export production records, or delete old snapshots.
RDS automated backups must separately have retention set to zero. Existing
SQLite files and snapshots remain on EC2 until deliberately cleaned up.
Release rollback does not undo database changes; future migrations must remain
compatible with the preceding application release. Follow
[RDS_MIGRATION.md](RDS_MIGRATION.md) for the initial SQLite-to-RDS cutover;
do not roll back to a SQLite application after RDS starts receiving submissions.

## Connect and check status

```sh
ssh -i ~/Downloads/test.pem ubuntu@13.206.108.114
sudo systemctl status orbyte-cloud
sudo journalctl -u orbyte-cloud -n 100 --no-pager
sudo systemctl restart orbyte-cloud
cat /opt/orbyte-cloud/current/REVISION
readlink -f /opt/orbyte-cloud/current
readlink -f /opt/orbyte-cloud/previous
```

The service definition is `/etc/systemd/system/orbyte-cloud.service` (source:
`ops/orbyte-cloud.service`). The installed deployment script is
`/usr/local/bin/orbyte-deploy` (source: `scripts/deploy-release.sh`). Changes
to either of these server configuration files require installing the updated
file on EC2; application deployments do not change the installed helper.
The old source directory `/home/ubuntu/orbyte-cloud-main` is retained for
reference and is no longer the running application.

## Admin dashboard

The bundled admin page has no login. To access it, run this command on your Mac
and leave it open:

```sh
ssh -i ~/Downloads/test.pem -N -L 3001:127.0.0.1:3000 ubuntu@13.206.108.114
```

Then open http://127.0.0.1:3001/admin.

## Manual rollback

Connect with your original `test.pem` key and run:

```sh
sudo -u orbyte-deploy bash
exec 9>/opt/orbyte-cloud/.deploy.lock
flock -w 120 9
previous=$(readlink -f /opt/orbyte-cloud/previous)
ln -s "$previous" /opt/orbyte-cloud/rollback-link
mv -Tf /opt/orbyte-cloud/rollback-link /opt/orbyte-cloud/current
sudo systemctl restart orbyte-cloud
curl --fail http://127.0.0.1:3000/ > /dev/null
exit
```

Do not run a deployment concurrently with a manual rollback. The lock above
prevents overlap. Inspect application logs if the health check fails.

The original administrative key remains in `~/Downloads/test.pem`. The
dedicated CI key is in `~/.ssh/orbyte-cloud-actions` on the setup Mac and is
stored encrypted in the GitHub environment. Never commit either key.
GitHub runners must be able to reach EC2 on TCP port 22. AWS access keys are
not used. HTTPS and a custom domain have not been configured.
