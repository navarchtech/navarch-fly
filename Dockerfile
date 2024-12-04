# base node image
FROM node:18.17-bullseye-slim AS base

# set for base and all layer that inherit from it
ENV NODE_ENV=production

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl sqlite3 python3 build-essential postgresql-client && \
    rm -rf /var/lib/apt/lists/* && \
    yarn config set python /usr/bin/python3

# Install all node_modules, including dev dependencies
FROM base AS deps

WORKDIR /myapp

ADD package.json .npmrc ./
RUN npm install --production=false
#  --target_arch=x64 --target_platform=linux --target_libc=glibc

# Setup production node_modules
FROM base AS production-deps

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
ADD package.json .npmrc ./
RUN npm prune --production

# Finally, build the production image with minimal footprint
FROM base

ENV PORT="8055"
ENV NODE_ENV="production"

# add shortcut for connecting to database CLI
# RUN echo "#!/bin/sh\nset -x\nsqlite3 \$DATABASE_URL" > /usr/local/bin/database-cli && chmod +x /usr/local/bin/database-cli

WORKDIR /myapp

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

# TODO: Use ARG to pass in which env and toml file to use
COPY --from=production-deps /myapp/node_modules /myapp/node_modules
COPY ./uploads/. /myapp/uploads/.
COPY ./templates/secrets/${APP_NAME}/. .
COPY ./templates/envs/${APP_NAME}.env .env
COPY ./templates/tomls/fly.${APP_NAME}.toml fly.toml

# TODO: This is potentially adding other companies secrets.
# May be better to add files individually which are needed.
# ADD . .

# Seed not ready yet
# ADD seed ./seed
COPY package.json .
COPY package-lock.json .
COPY extensions ./extensions
COPY fonts ./fonts
COPY start.sh .

CMD ["bash", "start.sh"]