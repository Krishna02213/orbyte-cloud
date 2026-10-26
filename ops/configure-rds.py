"""Run interactively with sudo on EC2. Passwords are never printed or passed as arguments."""
import argparse
import getpass
import grp
import json
import os
from pathlib import Path
import tempfile
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("--host", required=True)
args = parser.parse_args()
if os.geteuid() != 0:
    parser.error("Run with sudo so configuration files can be protected.")
if not args.host.endswith(".ap-south-1.rds.amazonaws.com"):
    parser.error("Expected the Mumbai RDS endpoint.")

directory = Path("/etc/orbyte-cloud")
group_id = grp.getgrnam("orbyte-cloud").gr_gid
directory.mkdir(mode=0o750, exist_ok=True)
os.chown(directory, 0, group_id)
os.chmod(directory, 0o750)
paths = [directory / "database.json", directory / "preflight.json"]
if any(path.exists() for path in paths):
    parser.error("Configuration already exists. Update it deliberately instead of overwriting it.")

passwords = [getpass.getpass("Existing password for orbyte_app: "),
             getpass.getpass("Existing password for orbyte_probe: ")]
if not all(passwords):
    parser.error("Both passwords are required. No configuration has been written.")

def save(path, content):
    descriptor, temporary = tempfile.mkstemp(dir=directory)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.chown(temporary, 0, group_id)
        os.chmod(temporary, 0o640)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

certificate = directory / "rds-ca.pem"
with urllib.request.urlopen(
    "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem", timeout=30
) as response:
    save(certificate, response.read())

for path, database, username, password in zip(
    paths, ["orbyte", "orbyte_preflight"], ["orbyte_app", "orbyte_probe"], passwords
):
    save(path, (json.dumps({
        "host": args.host, "port": 5432, "database": database,
        "user": username, "password": password, "caPath": str(certificate),
    }) + "\n").encode())
    print("Saved protected configuration:", path)
print("Configuration staged. The running service has not been restarted or changed.")
