# SQLite to RDS PostgreSQL cutover

This branch prepares the application and pipeline. Do not merge it until server
configuration and data transfer are complete. Creating RDS and its table does
not change the existing SQLite application.
The updated deploy job is also gated by the repository variable
`ORBYTE_RDS_READY=true`. Set it only after the server and import are verified.
An early merge without that variable builds the code but skips deployment.

## Database access

Production: database `orbyte`, role `orbyte_app`, with SELECT and INSERT on
`public.consultation_requests`, and USAGE/SELECT on its identity sequence.
The administrator already created that table using `scripts/schema.sql`.
Production schema changes are explicit administrator operations, never startup
side effects or a build step.

The setup command below creates an isolated `orbyte_preflight` database and a
dedicated `orbyte_probe` login with a generated password. The probe role receives
no production-table grants. Its database is on the same RDS instance, but release
checks do not write to the production database.

## Stage credentials privately on EC2

Copy `ops/configure-rds.py` to EC2 and run it in an interactive SSH terminal:

```sh
sudo python3 /home/ubuntu/orbyte-rds-setup/configure-rds.py \
  --host orbyte-db.c1e8gqkwku76.ap-south-1.rds.amazonaws.com
```

It prompts privately for the existing passwords for `orbyte_app` and the
administrator `postgres`. It validates the app login before making changes,
then creates/configures the probe role and database with the administrator's
permissions. The probe password is generated automatically and not displayed.
Passwords are not printed, put into shell history, or sent to GitHub. Temporary
root-only libpq password files are deleted after each connection; the master
password is not retained. The script downloads the AWS CA bundle and writes
root-owned configuration files at
`/etc/orbyte-cloud/database.json` and `/etc/orbyte-cloud/preflight.json`, with
mode 640 and group `orbyte-cloud`. Both application users are already trusted
members of that group. No live service configuration is changed by this step.

Use the passing PR's Linux artifact to stage the tested release at
`/opt/orbyte-cloud/rds-migration/release` without changing `current`.
Initialize and check the preflight database as `orbyte-deploy`:

```sh
cd /opt/orbyte-cloud/rds-migration/release
sudo -u orbyte-deploy env ORBYTE_DATABASE_CONFIG=/etc/orbyte-cloud/preflight.json \
  node scripts/init-postgres.mjs
sudo -u orbyte-deploy env ORBYTE_DATABASE_CONFIG=/etc/orbyte-cloud/preflight.json \
  node scripts/check-postgres.mjs orbyte_preflight
sudo -u orbyte-deploy env ORBYTE_DATABASE_CONFIG=/etc/orbyte-cloud/database.json \
  node scripts/check-postgres.mjs orbyte
```

## Import during a short pause in form submissions

Pause application deployments and wait for any active deployment to finish.
Temporarily add an exact Nginx location for `/api/consultations` that returns
HTTP 503, validate with `sudo nginx -t`, and reload Nginx. Other pages can remain
available. Confirm requests are rejected and existing requests have completed
before reading SQLite. Keep this pause through import, sequence advancement, and
initial RDS deployment so no records arrive at the old database mid-transfer.

From the staged release directory:

```sh
sudo -u orbyte-deploy env ORBYTE_DATABASE_CONFIG=/etc/orbyte-cloud/database.json \
  node scripts/import-sqlite.mjs --import-writes-paused /var/lib/orbyte-cloud/orbyte.db
```

The importer opens SQLite read-only, preserves every ID and field value, treats
SQLite's naive timestamps as UTC, and verifies every imported record before
committing a PostgreSQL transaction. It refuses a nonempty destination. A
failed import rolls back instead of leaving partial records. It creates no
database backup or exported copy. If the destination has existing submissions,
stop and reconcile them instead of deleting or overwriting them.

The importer advances PostgreSQL's identity sequence past SQLite's last issued
ID, including IDs of deleted records. It uses `nextval` with the app role's
existing USAGE permission and never resets the sequence backwards or grants
UPDATE permission. An excessive advancement gap (over one million) aborts the
import for explicit administrator handling. Sequence gaps after a rolled-back
transaction are harmless and normal in PostgreSQL. Verify again from the staged
release:

```sh
sudo -u orbyte-deploy env ORBYTE_DATABASE_CONFIG=/etc/orbyte-cloud/database.json \
  node scripts/import-sqlite.mjs --verify /var/lib/orbyte-cloud/orbyte.db
```

## Switch the application

Once checks pass, install the reviewed `scripts/deploy-release.sh` root-owned
at `/usr/local/bin/orbyte-deploy` and `ops/orbyte-cloud.service` at
`/etc/systemd/system/orbyte-cloud.service`. Run `systemctl daemon-reload` but
leave the existing process running until deployment. The new service reads the
protected production connection file. The new helper replaces SQLite backups
with PostgreSQL access checks and never runs production DDL.

After preparation, set the repository Actions variable `ORBYTE_RDS_READY` to
`true` and merge the PR after its checks pass. CI/CD rebuilds and deploys on `main`.
Keep the Nginx write pause until the deployed commit and production admin page
are verified. If activation fails, the helper restores the previous app, but
keep writes paused while investigating the initial cross-database cutover.

On success, make `previous` point to the working PostgreSQL release before
resuming writes; future rollbacks must not reactivate the SQLite app. Remove
the temporary Nginx location, validate and reload Nginx. Test a new submission
and confirm it appears in RDS. Delete that synthetic record as `postgres` if
desired; the app role does not have DELETE privileges.

After this cutover, app rollbacks continue using RDS and do not reverse database
changes. RDS automated backups and deployment-time database backups are disabled
as requested. Existing source SQLite files and old snapshots are not deleted by
this migration. Credential files must never be committed or uploaded as CI
artifacts. Production and preflight credentials are not stored in GitHub.
