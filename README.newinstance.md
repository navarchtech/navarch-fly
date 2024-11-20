# Create New Instance For New Client

## Prerequisite

1. Ensure flyctl / fly CLI is [installed](https://fly.io/docs/flyctl/install/), then use `fly auth login` to login to your fly.io account on which you've been added to the navarch org.

## Steps

1. Create a new project in [Neon](https://console.neon.tech/). Then, make sure a few steps are done here:
    - Go to the dashboard of the new DB and select "Create Database" and create a new one called `navarch_db` where we'll use instead of the default of `neondb`.
    - Then, select "Create Role" and create a new one called `admin` where we'll use instead of the default of `neondb_onwer`. These are important steps for data seeding to work correctly.
2. Create a new app in the fly.io [Navarch org](https://fly.io/dashboard/navarch). This is best done using [script](./deploy.sh).
3. Create a [new service account](https://console.cloud.google.com/iam-admin/serviceaccounts?project=nav-apps-prd-7443&supportedpurview=project) with the naming convention of `nav-[client_name]`. **DO NOT** grant any roles when creating the service account. We don't want this service account to have access to other buckets in other companies.
4. Create a [new bucket in GCP](https://console.cloud.google.com/storage/browser?project=nav-apps-prd-7443) to store client data. Use the exact same naming convention of `nav-[client_name]`.
5. Navigate to the newly created bucket, select the "Permission" tab and add the service account as "Storage Object Admin" to this bucket. The principal to add is for example: `nav-[client_name]@nav-apps-prd-7443.iam.gserviceaccount.com`.
6. Navigate back to the Service Account that was newly created, create a new JSON key. Store the file into the secrets directory.
7. Duplicate and populate important information for the `.toml` and `.env` files:
    - Create a new file in [tomls](./templates/tomls/) for the new client, populate important info.
    - Create a new file in [envs](./templates/envs/) for the new client, populate important info.
8. Deploy the changes to fly.io under the navarch org. To do that, you'll need to copy some sensitive values from the `[client_name].env` file and replace the `deploy.sh` script, and run `./deploy.sh [clientname]` to deploy to fly.io. Make sure you open the URL to kick start the application and iterate the configs until you get a successful instance running.
9. We can now seed the database (`navarch_db`) with our data.
    - Depending on whether you have a clean export of a database we can start with, you may need to dump it from a known good Navarch instance. Inspect the [db-1-backup.sh](./db-1-backup.sh) and change the env path before running to dump a copy of `navarch_*` schemas to your local machine.
    - Then, inspect the [db-2-restore.sh](./db-2-restore.sh) and change the env path before running to load the dumped data into the new database for the new client.
10. Enter Neon DB console again and enter the newly seeded database. Delete from the following tables everything that can be deleted that are not constrained by deletions, or use the [db-3-restore.sh](./db-3-cleanup.sh) script to perform a clean up of the new instance.
    - directus_files
    - directus_users
    - directus_activity
