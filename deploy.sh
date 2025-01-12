#! /bin/bash

# This script is used to deploy the navarch to fly.io.
# It is intended to be run from the root of the project.
# This script accepts the name of the app as the first argument
# and by default deploys to the navarch organization. Note that
# the app name must be unique across all of fly.io.
# Please run `flyctl auth login` before running this script.
# eg: ./deploy.sh navarch
# Or simply: eg: ./deploy.sh navarch

# The following environment variables must be set:
APP_NAME=$1
APP_ORG="${2:-navarch}"

# If APP_NAME is not provided, exit
if [ -z "$APP_NAME" ]; then
    echo "Please provide an app name as the first argument"
    exit 1
fi

# If the env file is not found, exit
if [ ! -f templates/envs/$APP_NAME.env ]; then
    echo "Environment file not found: templates/envs/$APP_NAME.env"
    exit 1
fi

source templates/envs/$APP_NAME.env
cp templates/envs/$APP_NAME.env .env
cp templates/tomls/fly.$APP_NAME.toml fly.toml

# Add safe guard to avoid deploying to the wrong client.
# If APP_NAME is not present in the loaded .env's PUBLIC_URL, exit
if [[ ! "$PUBLIC_URL" == *"$APP_NAME"* ]]; then
    echo "APP_NAME does not match PUBLIC_URL in .env. Is your .env properly configured?"
    exit 1
fi

# Check that `app = "$APP_NAME"` is present in fly.toml
if ! grep -q "app = \"$APP_NAME\"" fly.toml; then
    echo "app = \"$APP_NAME\" not found in fly.toml"
    exit 1
fi

# Check that `APP_NAME = "$APP_NAME"` is present in fly.toml
if ! grep -q "APP_NAME = \"$APP_NAME\"" fly.toml; then
    echo "APP_NAME = \"$APP_NAME\" not found in fly.toml"
    exit 1
fi

echo "Deploying '$APP_NAME' to fly.io org '$APP_ORG'"
echo "Admin email: $ADMIN_EMAIL"
echo "Admin password: $ADMIN_PASSWORD"

# First check if the app is already present
# If it is, then we will not create a new app
# and proceed to deploying an updated version
APP_LIST=$(fly apps list)
APP_FOUND=false
for APP in $APP_LIST; do
  if [[ "$APP" == "$APP_NAME" ]]; then
    APP_FOUND=true
  fi
done

if [ "$APP_FOUND" = false ]; then
  fly launch --name $APP_NAME --org $APP_ORG --region syd --copy-config --no-deploy --vm-memory "2048" --vm-cpus 1

  # Replace the generated fly.toml with our own fly.toml.template
  # while replacing the app name to the one provided.
  # cp fly.toml.template fly.toml
  sed -i -e "s/^app = .*/app = \"$APP_NAME\"/" fly.toml && rm fly.toml-e

  flyctl secrets set KEY=$(openssl rand -hex 32)
  flyctl secrets set SECRET=$(openssl rand -hex 32)
  flyctl secrets set ADMIN_EMAIL=$ADMIN_EMAIL
  flyctl secrets set ADMIN_PASSWORD=$ADMIN_PASSWORD
  flyctl secrets set PUBLIC_URL=https://$APP_NAME.fly.dev
  flyctl volumes create data --region syd --size 1 --yes
else
  echo "App '$APP_NAME' already exists, update only."
fi

npm i
npm run deploy