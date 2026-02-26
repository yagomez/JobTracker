#!/bin/bash
# Initialize SQLite database

mkdir -p data
cd "$(dirname "$0")"

# Create database and initialize schema
sqlite3 data/job_tracker.db < lib/db/schema.sql

echo "✅ Database initialized at data/job_tracker.db"
