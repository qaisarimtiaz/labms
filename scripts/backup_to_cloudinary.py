"""
Daily database backup: exports every collection in the app's MongoDB database
to a single JSON file (MongoDB Extended JSON, so ObjectIds/Dates round-trip
correctly) and uploads it to Cloudinary as a raw file.

Run manually:
    MONGODB_URI=... CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=... \
        python scripts/backup_to_cloudinary.py

In CI (GitHub Actions), these are read from repository secrets - see
.github/workflows/backup.yml.
"""
import os
import sys
import json
from datetime import datetime, timezone

from pymongo import MongoClient
from bson import json_util
import cloudinary
import cloudinary.uploader

MONGODB_URI = os.environ.get("MONGODB_URI")
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")

DB_NAME = "lab_management"

required = {
    "MONGODB_URI": MONGODB_URI,
    "CLOUDINARY_CLOUD_NAME": CLOUDINARY_CLOUD_NAME,
    "CLOUDINARY_API_KEY": CLOUDINARY_API_KEY,
    "CLOUDINARY_API_SECRET": CLOUDINARY_API_SECRET,
}
missing = [k for k, v in required.items() if not v]
if missing:
    print(f"Missing required environment variable(s): {', '.join(missing)}", file=sys.stderr)
    sys.exit(1)

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True,
)

client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=15000)
db = client[DB_NAME]

backup = {}
total_docs = 0
for name in db.list_collection_names():
    docs = list(db[name].find({}))
    backup[name] = docs
    total_docs += len(docs)
    print(f"  {name}: {len(docs)} documents")

client.close()

date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
filename = f"lab-backup-{date_str}.json"
filepath = os.path.join(os.getcwd(), filename)

with open(filepath, "w", encoding="utf-8") as f:
    # relaxed=False keeps strict Extended JSON ($oid, $date, ...) so a
    # restore script can rebuild exact ObjectId/Date types, not just strings.
    f.write(json_util.dumps(backup, indent=None, json_options=json_util.CANONICAL_JSON_OPTIONS))

size_kb = os.path.getsize(filepath) / 1024
print(f"\nWrote {filepath} ({size_kb:.1f} KB, {total_docs} total documents)")

print("Uploading to Cloudinary...")
result = cloudinary.uploader.upload(
    filepath,
    resource_type="raw",
    public_id=f"lab-backups/{filename}",
    overwrite=True,
)
print(f"Uploaded: {result.get('secure_url')}")

os.remove(filepath)
print("Done.")
