# Atlas Keep-Alive

A small, serverless automation that keeps free-tier MongoDB Atlas clusters from auto-pausing. One GitHub repository, one scheduled workflow, any number of clusters.

## The Problem

MongoDB Atlas M0 (free tier) clusters are paused automatically after 30 days of inactivity. For developers running several side projects or portfolio apps, this means demos that suddenly stop working and manual resumes in the Atlas dashboard.

## The Solution

A scheduled GitHub Actions workflow runs a Node.js script every three days. The script connects to each configured cluster and performs a real read operation, which Atlas counts as genuine activity. No servers to host, no extra services to pay for.

## Features

- **Multi-project support**: ping any number of clusters from a single repository
- **Zero infrastructure**: runs entirely on GitHub Actions
- **Real activity**: performs an actual query rather than a bare connection check
- **Fault isolated**: one failing cluster never blocks the others
- **Clear alerts**: the run fails if any cluster is unreachable, so GitHub notifies you
- **Secure by design**: connection strings live in encrypted GitHub Secrets, never in code
- **Extensible**: adding a project takes two small changes and no code edits

## How It Works

```
GitHub Actions (cron, every 3 days)
        |
        v
  keepalive.mjs
        |
        |-- reads every MONGODB_URI_* environment variable
        |-- connects to each cluster in parallel
        |-- lists collections and runs findOne() on the first one
        |     (falls back to a ping command on an empty database)
        v
  Logs "NAME: ok" per cluster, exits non-zero on any failure
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 20 |
| Database driver | MongoDB Node.js Driver 6.x |
| Automation | GitHub Actions (scheduled workflow) |
| Secrets | GitHub Encrypted Secrets |

## Project Structure

```
.
├── .github/
│   └── workflows/
│       └── keepalive.yml   # Schedule and secrets wiring
├── keepalive.mjs           # Connects to each cluster and runs a read
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- A GitHub account
- One or more MongoDB Atlas clusters
- A database user for each cluster (read-only is enough)

### 1. Create your repository

Fork or clone this project and push it to your own GitHub repository. A private repository is recommended.

### 2. Add your connection strings as secrets

In your repository, open **Settings → Secrets and variables → Actions → New repository secret** and add one secret per cluster:

| Secret name | Example value |
| --- | --- |
| `MONGODB_URI_PROJECT1` | `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/mydb?retryWrites=true&w=majority` |
| `MONGODB_URI_PROJECT2` | `mongodb+srv://USER:PASSWORD@cluster1.xxxxx.mongodb.net/otherdb?retryWrites=true&w=majority` |

Always include the database name in the connection string so the script reads from your real data.

### 3. Match the workflow to your secrets

Edit the `env:` block in `.github/workflows/keepalive.yml` so each secret you created is passed to the script:

```yaml
env:
  MONGODB_URI_PROJECT1: ${{ secrets.MONGODB_URI_PROJECT1 }}
  MONGODB_URI_PROJECT2: ${{ secrets.MONGODB_URI_PROJECT2 }}
```

### 4. Allow GitHub to reach Atlas

GitHub-hosted runners use changing IP addresses, so in each Atlas project open **Network Access** and add `0.0.0.0/0`. See the security notes below.

### 5. Resume paused clusters

If a cluster has already paused, resume it once from the Atlas dashboard. The script cannot connect to a paused cluster.

### 6. Run it

Open the **Actions** tab, select **keepalive**, and click **Run workflow**. A successful run logs one line per cluster:

```
PROJECT1: ok
PROJECT2: ok
```

From then on it runs automatically every three days.

## Adding Another Project

1. Create a new secret named `MONGODB_URI_NEWNAME`.
2. Add one line for it under `env:` in the workflow file.
3. Allow `0.0.0.0/0` in that Atlas project's Network Access.

The script itself never needs to change.

## Configuration

| Setting | Location | Default |
| --- | --- | --- |
| Run frequency | `cron` in `keepalive.yml` | Every 3 days at 06:00 UTC |
| Connection timeout | `serverSelectionTimeoutMS` in `keepalive.mjs` | 15 seconds |
| Manual runs | `workflow_dispatch` in `keepalive.yml` | Enabled |

## Security Notes

- Connection strings are stored only as encrypted GitHub Secrets and are never committed to the repository.
- Opening Network Access to `0.0.0.0/0` is a trade-off, because GitHub runners have no fixed IP range. Reduce the risk by using strong, unique database passwords and a dedicated **read-only** database user for each cluster.
- Use a private repository where possible.

## Limitations

- Scheduled workflows in **public** repositories are disabled by GitHub after 60 days without repository activity. Private repositories are not affected. If you use a public repo, re-enable the workflow when needed.
- GitHub may delay scheduled runs during periods of high load. A three-day interval leaves a wide safety margin inside Atlas's 30-day window.
- This project keeps free-tier clusters active. It is not a substitute for a production-grade hosting plan.

## License

MIT