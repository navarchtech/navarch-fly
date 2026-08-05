# This file is how Fly starts the server (configured in fly.toml). Before starting
# the server though, we need to run any migrations that haven't yet been
# run, which is why this file exists in the first place.
# Learn more: https://community.fly.io/t/sqlite-not-getting-setup-properly/4386

#!/bin/sh

set -ex
mkdir -p /data/database
mkdir -p /data/uploads
chmod -Rf 777 /data/database
chmod -Rf 777 /data/uploads

echo "Listing content in work directory"
ls -a

# replaces the database file with a seeded file, remove this and it will create it's own blank slate data.db file with the ADMIN_EMAIL and ADMIN_PASSWORD secret as the admin login detail
# requires .env file config DB_FILENAME="/data/database/data.db"
USING_SQLLITE=false
if [ "$USING_SQLLITE" = true ]; then
    cp /myapp/data.db /data/database
    echo "Listing /data/database content"
    ls -a /data/database
fi

# Echo out the DB_HOST and DB_USER and DB_DATABASE
echo "DB_HOST: $DB_HOST"
echo "DB_USER: $DB_USER"
echo "DB_DATABASE: $DB_DATABASE"
# echo "DB_CONNECTION_STRING: $DB_CONNECTION_STRING"

# Rename .env to avoid conflicts with environment variables
if [ -f .env ]; then
    echo "Renaming .env to .env.bak to ensure environment variables take precedence"
    mv .env .env.bak
fi

cp -r -a /myapp/uploads/. /data/uploads

npx directus bootstrap
npx directus start
