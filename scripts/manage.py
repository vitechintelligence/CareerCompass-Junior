"""Owner-only setup commands. Never run migrations automatically on application startup."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import sys
import psycopg
from psycopg.types.json import Jsonb

ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("command",choices=["migrate","invite-partner","import-book","check"])
    parser.add_argument("--file",type=Path)
    args=parser.parse_args()
    url=os.getenv("MIGRATION_DATABASE_URL")
    if not url:
        sys.exit("Set MIGRATION_DATABASE_URL in your private shell environment.")
    with psycopg.connect(url) as conn:
        if args.command=="migrate":
            exists=conn.execute("SELECT to_regclass('cc_private.schema_migrations')").fetchone()[0]
            done={r[0] for r in conn.execute("SELECT version FROM cc_private.schema_migrations")} if exists else set()
            for path in sorted((ROOT/"migrations").glob("*.sql")):
                if path.name[:3] not in done:
                    conn.execute(path.read_text(),prepare=False)
                    print("Applied",path.name)
        elif args.command=="invite-partner":
            invitation=secrets.token_hex(24)
            conn.execute("INSERT INTO cc_private.partner_invites(token_hash,expires_at) VALUES(%s,now()+interval '48 hours')",
                         (hashlib.sha256(invitation.encode()).hexdigest(),))
            conn.commit()
            print("One-time partner invitation, valid 48 hours (share privately):")
            print(invitation)
        elif args.command=="import-book":
            if not args.file:
                sys.exit("--file is required")
            bundle=json.loads(args.file.read_text())
            # Bundle files contain licensed content: keep them outside a public repository.
            result=conn.execute("SELECT cc_private.import_book_bundle(%s)",(Jsonb(bundle),)).fetchone()[0]
            print(json.dumps(result))
        elif args.command=="check":
            conn.execute("SET LOCAL ROLE cc_runtime")
            print(conn.execute("SELECT current_user,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user").fetchone())
            print("Credential table readable:",conn.execute("SELECT has_table_privilege(current_user,'cc_private.student_credentials','SELECT')").fetchone()[0])
if __name__=="__main__":
    main()
