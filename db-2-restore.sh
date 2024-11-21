#! /bin/bash

# set -ex

# Assumes .env file is placed alongside this script.
source templates/envs/brokenhillmines.env

export PGPASSWORD=$DB_PASSWORD

# Make sure dump folder exists and all files required are present.
if [ ! -d dump ]; then
    echo "Failed to find dump folder. Please run this script from the root of the project."
    exit 1
elif [ ! -f dump/seed_navarch_schema.sql ]; then
    echo "Failed to find dump/seed_navarch_schema.sql. Please run db-backup.sh first."
    exit 1
elif [ ! -f dump/seed_navarch_schema_data.sql ]; then
    echo "Failed to find dump/seed_navarch_schema_data.sql. Please run db-backup.sh first."
    exit 1
elif [ ! -f dump/seed_navarch_data.sql ]; then
    echo "Failed to find dump/seed_navarch_data.sql. Please run db-backup.sh first."
    exit 1
fi

# Check if some navarch_* tables are present in the database, if present,
# we do the safest thing and exit here. If we want to force restore, we can
# comment out this code to proceed overwriting the existing tables.
psql -h $DB_HOST -p 5432 -U $DB_USER $DB_DATABASE -c '\dt navarch_*' | grep 'navarch_' > /dev/null
if [ $? -eq 0 ]; then
    echo "Some navarch_* tables are already present in the database. Exiting to prevent accidental overwrite."
    echo "To continue restoring, press Enter to continue or Ctrl+C to exit."
    read
else
    echo "No navarch_* tables found in the database. Proceeding with restore."
fi
##### DANGER ZONE #####
# In case of any error in restoring and you want to start fresh, you can delete the database
# and run this script again. However, this will also destroy any directus schemas that were
# created when npx directus bootstrap was run. You will need to manually create the navarch_db
# in Neon console and run npx directus bootstrap by going to the website in order for directus_*
# tables to be created again.
# To delete the database, we mount as owner of the database and drop it _from_ the root database.
if true; then
    echo "Dropping database $DB_DATABASE. ARE YOU SURE? Press Enter to continue or Ctrl+C to exit!"
    read
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_ROOT_DATABASE -c "DROP DATABASE $DB_DATABASE;"
fi
##### DANGER ZONE #####

# Check if navarch_db exist before restoring. We want to create the database in Neon console
# and run the application to ensure the database is created with the correct schema before
# we restore. We don't want to create it here because?
# Ensure database is present before restoring.
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_DATABASE || true

# Ask for confirmation to continue, by printing all DB details and wait for enter:
echo "Restoring database with:"
echo "DB_HOST: $DB_HOST"
echo "DB_PORT: $DB_PORT"
echo "DB_USER: $DB_USER"
echo "DB_DATABASE: $DB_DATABASE"
echo "DB_PASSWORD: $DB_PASSWORD"
echo "Press Enter to continue or Ctrl+C to exit"
read

# The --no-privileges flag is used to prevent restoring any privileges that were present in the
# original database. This is because the privileges are not relevant to the new database and
# can cause issues if the user does not exist in the new database.
pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE --no-privileges -v dump/navarch_backup_all.dump

# psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -f dump/seed_navarch_schema.sql
# psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -f dump/seed_navarch_schema_data.sql
# psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -f dump/seed_navarch_data.sql

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "TRUNCATE TABLE navarch_parcel;"