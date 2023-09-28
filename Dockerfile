# base node image
FROM node:18.17-bullseye-slim as base

# set for base and all layer that inherit from it
ENV NODE_ENV production

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl sqlite3 python3 build-essential && \
    rm -rf /var/lib/apt/lists/* && \
    yarn config set python /usr/bin/python3

# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /myapp

ADD package.json .npmrc ./
RUN npm install --production=false

# Setup production node_modules
FROM base as production-deps

WORKDIR /myapp

COPY --from=deps /myapp/node_modules /myapp/node_modules
ADD package.json .npmrc ./
RUN npm prune --production

# Finally, build the production image with minimal footprint
FROM base

ENV DATABASE_URL=file:/data/database/data.db
ENV PORT="8055"
ENV NODE_ENV="production"

ENV STORAGE_LOCATIONS="local"
ENV STORAGE_LOCAL_DRIVER="local"
ENV STORAGE_LOCAL_ROOT="/data/uploads"

ENV DB_CLIENT="sqlite3"
ENV DB_FILENAME="/data/database/data.db"

# Randomly generated key and secret for local dev use
ENV KEY="c202e2ad-dd22-4023-8106-988224220f72"
ENV SECRET="f364a4f2f04bd7e297c5a009a40ae105f9129586059b591873a0880027da5fa7"

# add shortcut for connecting to database CLI
RUN echo "#!/bin/sh\nset -x\nsqlite3 \$DATABASE_URL" > /usr/local/bin/database-cli && chmod +x /usr/local/bin/database-cli

WORKDIR /myapp

COPY --from=production-deps /myapp/node_modules /myapp/node_modules
COPY ./uploads/. /myapp/uploads/.

ADD . .

CMD ["bash", "start.sh"]