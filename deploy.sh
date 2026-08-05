#! /bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# This script is used to deploy the navarch to fly.io.
# It is intended to be run from the root of the project.
# This script accepts the name of the app as the first argument
# and by default deploys to the navarch organization. Note that
# the app name must be unique across all of fly.io.
# Please run `flyctl auth login` before running this script.
# eg: ./deploy.sh navarch
# Or simply: eg: ./deploy.sh navarch

# The following environment variables must be set:
APP_NAME="${1:-}"
APP_ORG="${2:-navarch}"
APP_REGION="${APP_REGION:-syd}"

# Check for new commits in the remote branch
git fetch
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})
BASE=$(git merge-base @ @{u})

echo "$LOCAL $REMOTE $BASE"
if [ $? -ne 0 ]; then
    echo "Error: Unable to fetch remote branch. Please check your network connection."
    exit 1
fi

if [ $LOCAL = $REMOTE ]; then
    echo "Local branch is up-to-date with remote branch."
elif [ $LOCAL = $BASE ]; then
    echo "New commits are available in the remote branch. Pulling and rebasing..."
    git pull --rebase
    if [ $? -ne 0 ]; then
        echo "Failed to pull and rebase. Please resolve conflicts and try again."
        exit 1
    fi
elif [ $REMOTE = $BASE ]; then
    echo "Local branch has new commits that are not pushed to remote. Please push your changes first."
    exit 1
else
    echo "Local and remote branches have diverged. Please pull code and resolve any conflicts before try again."
    exit 1
fi

# If APP_NAME is not provided, exit
if [ -z "$APP_NAME" ]; then
    echo "Please provide an app name as the first argument"
    exit 1
fi

# If the env file is not found, exit
if [ ! -f "$SCRIPT_DIR/templates/envs/$APP_NAME.env" ]; then
    echo "Environment file not found: $SCRIPT_DIR/templates/envs/$APP_NAME.env"
    exit 1
fi

source "$SCRIPT_DIR/templates/envs/$APP_NAME.env"
cp "$SCRIPT_DIR/templates/envs/$APP_NAME.env" "$SCRIPT_DIR/.env"
cp "$SCRIPT_DIR/templates/tomls/fly.$APP_NAME.toml" "$SCRIPT_DIR/fly.toml"

# Add safe guard to avoid deploying to the wrong client.
# If APP_NAME is not present in the loaded .env's PUBLIC_URL, exit
if [[ ! "$PUBLIC_URL" == *"$APP_NAME"* ]]; then
    echo "APP_NAME does not match PUBLIC_URL in .env. Is your .env properly configured?"
    exit 1
fi

# Check that `app = "$APP_NAME"` is present in fly.toml
if ! grep -q "app = \"$APP_NAME\"" "$SCRIPT_DIR/fly.toml"; then
    echo "app = \"$APP_NAME\" not found in fly.toml"
    exit 1
fi

# Check that `APP_NAME = "$APP_NAME"` is present in fly.toml
if ! grep -q "APP_NAME = \"$APP_NAME\"" "$SCRIPT_DIR/fly.toml"; then
    echo "APP_NAME = \"$APP_NAME\" not found in fly.toml"
    exit 1
fi

echo "Deploying '$APP_NAME' to fly.io org '$APP_ORG'"
echo "Admin email: $ADMIN_EMAIL"
echo "Admin password: $ADMIN_PASSWORD"

if ! flyctl status -a "$APP_NAME" >/dev/null 2>&1; then
  flyctl apps create "$APP_NAME" --org "$APP_ORG" --yes

  flyctl secrets set -a "$APP_NAME" KEY="$(openssl rand -hex 32)"
  flyctl secrets set -a "$APP_NAME" SECRET="$(openssl rand -hex 32)"
  flyctl volumes create data -a "$APP_NAME" --region "$APP_REGION" --size 1 --yes
else
  echo "App '$APP_NAME' already exists, refreshing secrets before deploy."
fi

flyctl secrets set -a "$APP_NAME" ADMIN_EMAIL="$ADMIN_EMAIL"
flyctl secrets set -a "$APP_NAME" ADMIN_PASSWORD="$ADMIN_PASSWORD"
flyctl secrets set -a "$APP_NAME" PUBLIC_URL="https://$APP_NAME.fly.dev"

npm i
npm run deploy
