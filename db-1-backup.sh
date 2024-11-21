#! /bin/bash

# Assumes .env file is placed alongside this script.
source templates/envs/navarch.env

mkdir dump

# If DB_HOST is docker.for.mac.host.internal
# then we need to use localhost instead.
if [ "$DB_HOST" == "docker.for.mac.host.internal" ]; then
  DB_HOST='localhost'
fi

export PGPASSWORD=$DB_PASSWORD

pg_dump -U $DB_USER -d $DB_DATABASE -h $DB_HOST -F c -b -v -f dump/navarch_backup_all.dump

# Old method that dumps specific directus tables and then navarch tables.
# Step 1: Dump directus tables
# pg_dump -U $DB_USER -d $DB_DATABASE -h $DB_HOST --schema-only \
#     --table 'directus_*' \
#     > dump/seed_directus_schema.sql
# pg_dump -U $DB_USER -d $DB_DATABASE -h $DB_HOST --data-only \
#     --table directus_collections \
#     --table directus_fields \
#     --table directus_permissions \
#     --table directus_relations \
#     --table directus_roles \
#     > dump/seed_directus_schema_data.sql
# pg_dump -U $DB_USER -d $DB_DATABASE -h $DB_HOST --data-only \
#     --exclude-table directus_collections \
#     --exclude-table directus_fields \
#     --exclude-table directus_permissions \
#     --exclude-table directus_relations \
#     --exclude-table directus_roles \
#     --exclude-table directus_activity \
#     --exclude-table directus_revisions \
#     --exclude-table 'navarch_*' \
#     > dump/seed_directus_data.sql
#
# Step 2: Dump navarch tables
# pg_dump -U $DB_USER -d $DB_DATABASE -h $DB_HOST --schema-only \
#     --table 'navarch_*' \
#     > dump/seed_navarch_schema.sql
# pg_dump -U $DB_USER -d $DB_DATABASE -h $DB_HOST \
#     --table 'navarch_*' \
#     > dump/seed_navarch_schema_data.sql

# pg_dump -U $DB_USER -d $DB_DATABASE -h $DB_HOST \
#     --table 'navarch_*' \
#     > dump/seed_navarch_data.sql
