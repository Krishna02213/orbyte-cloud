"""Run interactively with sudo on EC2. Passwords are never printed or passed as arguments."""
import argparse
import getpass
import grp
import json
import os
from pathlib import Path
import secrets
import subprocess
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

application_password = getpass.getpass("Existing password for orbyte_app: ")
administrator_password = getpass.getpass("Existing master password for postgres: ")
probe_password = secrets.token_urlsafe(32)
if not application_password or not administrator_password:
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

def sql(user, password, database, statement):
    # libpq reads this short-lived root-only file; passwords never appear in
    # arguments, environment variables, shell history, or console output.
    descriptor, password_file = tempfile.mkstemp(dir=directory)
    try:
        escaped = password.replace("\\", "\\\\").replace(":", "\\:")
        with os.fdopen(descriptor, "w") as handle:
            handle.write(f"{args.host}:5432:{database}:{user}:{escaped}\n")
        environment = dict(os.environ)
        environment.pop("PGPASSWORD", None)
        environment.update({
            "PGHOST": args.host, "PGPORT": "5432", "PGUSER": user,
            "PGPASSFILE": password_file, "PGSSLMODE": "verify-full",
            "PGSSLROOTCERT": str(certificate), "PGCONNECT_TIMEOUT": "10",
        })
        result = subprocess.run(
            ["psql", "-X", "--no-password", "--quiet", "--tuples-only", "--no-align",
             "--set", "ON_ERROR_STOP=1", "--dbname", database],
            input=statement, text=True, capture_output=True, env=environment, timeout=60,
        )
        if result.returncode:
            message = result.stderr
            for value in (application_password, administrator_password, probe_password):
                message = message.replace(value, "[redacted]")
            raise RuntimeError(f"Database setup failed for {user}: {message.strip()}")
        return result.stdout.strip()
    finally:
        os.unlink(password_file)

try:
    identity = sql("orbyte_app", application_password, "orbyte",
                   "SELECT current_user || '|' || current_database();")
    if identity != "orbyte_app|orbyte":
        raise RuntimeError("Application login did not match the expected role/database.")
    sql("orbyte_app", application_password, "orbyte",
        "SELECT COUNT(*) FROM public.consultation_requests;")
    sql("postgres", administrator_password, "orbyte", "SELECT current_user;")
    exists = sql("postgres", administrator_password, "orbyte",
                 "SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='orbyte_probe');")
    operation = "ALTER" if exists == "t" else "CREATE"
    # Generated URL-safe password contains no SQL quoting characters.
    sql("postgres", administrator_password, "orbyte",
        f"{operation} ROLE orbyte_probe LOGIN PASSWORD '{probe_password}';")
    exists = sql("postgres", administrator_password, "orbyte",
                 "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname='orbyte_preflight');")
    if exists != "t":
        sql("postgres", administrator_password, "orbyte", "CREATE DATABASE orbyte_preflight;")
    sql("postgres", administrator_password, "orbyte",
        "REVOKE CONNECT ON DATABASE orbyte_preflight FROM PUBLIC; "
        "GRANT CONNECT ON DATABASE orbyte_preflight TO orbyte_probe;")
    sql("postgres", administrator_password, "orbyte_preflight",
        "GRANT USAGE, CREATE ON SCHEMA public TO orbyte_probe;")
    sql("orbyte_probe", probe_password, "orbyte_preflight", "SELECT current_database();")
except (RuntimeError, subprocess.TimeoutExpired) as error:
    parser.exit(1, str(error) + "\nCredential files were not written; the live service is unchanged.\n")

for path, database, username, password in zip(
    paths, ["orbyte", "orbyte_preflight"], ["orbyte_app", "orbyte_probe"],
    [application_password, probe_password]
):
    save(path, (json.dumps({
        "host": args.host, "port": 5432, "database": database,
        "user": username, "password": password, "caPath": str(certificate),
    }) + "\n").encode())
    print("Saved protected configuration:", path)
print("Configuration staged. The running service has not been restarted or changed.")
print("Application and preflight logins verified. The administrator password was not retained.")
