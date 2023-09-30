#! /bin/bash

# This script is used to deploy the navarch to fly.io.
# It is intended to be run from the root of the project.
# This script accepts the name of the app as the first argument
# and by default deploys to the navarch organization. Note that
# the app name must be unique across all of fly.io.
# Please run `flyctl auth login` before running this script.
# eg: ./deploy.sh devapp navarch 'admin@navarchtech' 'password'
# Or simply: eg: ./deploy.sh devapp

# The following environment variables must be set:
APP_NAME=$1
APP_ORG="${2:-navarch}"
APP_EMAIL="${3:-'admin@navarchtech.com'}"
APP_PASSWORD="${4:-password}"

# If APP_NAME is not provided, exit
if [ -z "$APP_NAME" ]; then
    echo "Please provide an app name as the first argument"
    exit 1
fi

echo "Deploying '$APP_NAME' to fly.io org '$APP_ORG'"
echo "Admin email: $APP_EMAIL"
echo "Admin password: $APP_PASSWORD"

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
  flyctl launch --name $APP_NAME --org $APP_ORG --region syd --copy-config --no-deploy

  # Replace the generated fly.toml with our own fly.toml.template
  # while replacing the app name to the one provided.
  cp fly.toml.template fly.toml
  sed -i -e "s/^app = .*/app = \"$APP_NAME\"/" fly.toml && rm fly.toml-e
  
  flyctl secrets set KEY=$(openssl rand -hex 32)
  flyctl secrets set SECRET=$(openssl rand -hex 32)
  flyctl secrets set ADMIN_EMAIL=$APP_EMAIL
  flyctl secrets set ADMIN_PASSWORD=$APP_PASSWORD
  flyctl secrets set PUBLIC_URL=https://$APP_NAME.fly.dev
  flyctl volumes create data --region syd --size 1 --yes
else
  echo "App '$APP_NAME' already exists, update only."
fi

npm run deploy