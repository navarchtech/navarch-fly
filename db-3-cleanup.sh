#! /bin/bash

# set -ex

# Assumes .env file is placed alongside this script.
source templates/envs/brokenhillmines.env

export PGPASSWORD=$DB_PASSWORD

# Ask for confirmation to continue, by printing all DB details and wait for enter:
echo "Clean up new database with:"
echo "DB_HOST: $DB_HOST"
echo "DB_PORT: $DB_PORT"
echo "DB_USER: $DB_USER"
echo "DB_DATABASE: $DB_DATABASE"
echo "DB_PASSWORD: $DB_PASSWORD"
echo "Press Enter to continue or Ctrl+C to exit"
read

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "UPDATE navarch_commodity_price SET user_created = NULL;"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "UPDATE navarch_commodity_price SET user_updated = NULL;"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "UPDATE navarch_address SET user_created = NULL;"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "UPDATE directus_files SET uploaded_by = NULL;"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "TRUNCATE TABLE directus_activity CASCADE;"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "TRUNCATE TABLE directus_revisions CASCADE;"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "TRUNCATE TABLE directus_files CASCADE;"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "TRUNCATE TABLE navarch_parcel CASCADE;"
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "TRUNCATE TABLE navarch_contract CASCADE;"