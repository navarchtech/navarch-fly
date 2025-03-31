# Running Navarch Locally

We can run Navarch's Directus as if it's running in Fly.io as long as we have Docker installed. The important files required to run locally are:

- `Dockerfile`: Packages necessary code into an image to be run in Docker as a container
- `.env`: Defines Directus' variables, including GCS storage path and a duplicated database
- `extensions/` codes: Mounted so that we can test code live as it changes
- `docker-compose.yml`: Instructs the runtime environment variables, including where to mount extension code

## Step 1: Duplicate database

Navigate to https://console.neon.tech/ and branch off from `main` branch. Be sure to name the branch clearly enough to identify that you intend to delete the test branch when we are done with the development work. Take a note of the connection details and duplicate the [.env](./templates/envs/) file in a named file that is clearly set for your development goal. Example: `my_test.env`

## Step 2: Preparing GCS storage

If no files or images are to be created, feel free to continue using the navarch test bucket with the same service account credentials found in [templates/secrets/navarch](./templates/secrets/navarch). Just duplicate it and name it appropriately, example `my_test`.

You can optionally use a local folder by uncommenting `- ./uploads:/myapp/uploads` in `docker-compose.yml` file to map your local `uploads` folder into the running istance in Docker.

## Step 3: Run Navarch (Directus) in Docker

Once the above steps are done, start Docker daemon and run `docker compose build && docker compose up` to run Navarch Directus. The ports 8080 and 8055 are mapped to local network as they are the commonly used ports in Directus. Once your `extensions/*` code gets updated, it should automatically reload if `EXTENSIONS_AUTO_RELOAD` is set in your `.env` file. Otherwise, Ctrl-C on your Docker container and restart by running the same command.
