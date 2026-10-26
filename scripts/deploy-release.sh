#!/usr/bin/env bash
# Installed root-owned at /usr/local/bin/orbyte-deploy; runs as orbyte-deploy.
# The dedicated SSH key is forced to run this command and cannot open a shell.
set -Eeuo pipefail
umask 027

if [[ ! ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([a-f0-9]{40})\ ([0-9]+-[0-9]+)\ ([a-f0-9]{64})$ ]]; then
  echo 'Expected: deploy COMMIT_SHA RUN_ID-ATTEMPT ARCHIVE_SHA256' >&2
  exit 2
fi
revision=${BASH_REMATCH[1]}
run=${BASH_REMATCH[2]}
digest=${BASH_REMATCH[3]}
root=/opt/orbyte-cloud
release="$root/releases/release-$revision-$run"
exec 9>"$root/.deploy.lock"
flock -w 120 9
previous=$(readlink -f "$root/current")
work=$(mktemp -d "$root/.incoming.XXXXXXXX")
probe_pid=''
switched=false
completed=false

health_check() {
  local port=$1
  for attempt in {1..30}; do
    if curl --fail --silent --max-time 3 "http://127.0.0.1:$port/" -o "$work/health.html" &&
       grep -q 'Orbyte Cloud' "$work/health.html" &&
       curl --fail --silent --max-time 3 "http://127.0.0.1:$port/favicon.svg" -o /dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ -n $probe_pid ]]; then
    kill "$probe_pid" 2>/dev/null || true
    wait "$probe_pid" 2>/dev/null || true
  fi
  if [[ $completed != true && $switched == true ]]; then
    echo 'Deployment failed; restoring the previous release.' >&2
    ln -s "$previous" "$work/rollback"
    mv -Tf "$work/rollback" "$root/current"
    if sudo -n /usr/bin/systemctl restart orbyte-cloud && health_check 3000; then
      echo 'Previous release restored.' >&2
    else
      echo 'ERROR: rollback health check failed; inspect orbyte-cloud logs.' >&2
    fi
  fi
  if [[ $completed != true && -f $work/probe.log ]]; then
    tail -n 50 "$work/probe.log" >&2
  fi
  rm -rf -- "$work"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Receive the exact artifact tested by CI. Never install dependencies on EC2.
timeout 120 cat > "$work/release.tar.gz"
printf '%s  %s\n' "$digest" "$work/release.tar.gz" | sha256sum --check --status
if [[ -e $release ]]; then
  echo 'This deployment attempt already exists; rerun the GitHub job.' >&2
  exit 1
fi
mkdir "$release"
tar --extract --gzip --file "$work/release.tar.gz" --directory "$release" --no-same-owner --no-same-permissions
test -f "$release/server.js"
test -f "$release/.next/BUILD_ID"
test "$(cat "$release/REVISION")" = "$revision"

# Check the Linux artifact with a disposable database before switching traffic.
mkdir "$work/data"
(
  cd "$release"
  exec env NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=127.0.0.1 PORT=3002 \
    ORBYTE_DATA_DIR="$work/data" /usr/bin/node server.js
) > "$work/probe.log" 2>&1 &
probe_pid=$!
health_check 3002
kill "$probe_pid"
wait "$probe_pid" 2>/dev/null || true
probe_pid=''

# Use SQLite's online backup API so the running database remains consistent.
python3 - "$revision-$run" <<'PY'
import pathlib
import sqlite3
import sys
data = pathlib.Path('/var/lib/orbyte-cloud')
source = data / 'orbyte.db'
if source.exists():
    backups = data / 'backups'
    backups.mkdir(exist_ok=True)
    destination = backups / (sys.argv[1] + '.db')
    with sqlite3.connect(f'file:{source}?mode=ro', uri=True) as live:
        with sqlite3.connect(destination) as snapshot:
            live.backup(snapshot)
    print('Database snapshot saved:', destination.name)
PY

ln -s "$release" "$work/current"
# Set this first so an interruption during the switch also triggers rollback.
switched=true
mv -Tf "$work/current" "$root/current"
sudo -n /usr/bin/systemctl restart orbyte-cloud
health_check 3000
pid=$(/usr/bin/systemctl show orbyte-cloud --property=MainPID --value)
test "$(readlink -f "/proc/$pid/cwd")" = "$release"
ln -s "$previous" "$work/previous"
mv -Tf "$work/previous" "$root/previous"
completed=true
echo "Deployed $revision (GitHub run $run)"

# Bound storage usage on this small instance. Keep current and previous releases.
python3 <<'PY'
import pathlib
import shutil
root = pathlib.Path('/opt/orbyte-cloud')
protected = {(root / name).resolve() for name in ('current', 'previous')}
releases = sorted(
    (p for p in (root / 'releases').iterdir()
     if p.is_dir() and not p.is_symlink() and p.name.startswith(('release-', 'bootstrap-'))),
    key=lambda p: p.stat().st_mtime, reverse=True,
)
for path in releases[3:]:
    if path.resolve() not in protected:
        shutil.rmtree(path)
backups = pathlib.Path('/var/lib/orbyte-cloud/backups')
if backups.exists():
    for path in sorted(backups.glob('*.db'), key=lambda p: p.stat().st_mtime, reverse=True)[5:]:
        path.unlink()
PY
