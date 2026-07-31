---
title: Live Deployment
description: Deploy a production-shaped RunHelm installation with a native orchestrator and containerized workers.
---

This guide describes a production-shaped RunHelm deployment for
a single-tenant environment. It runs the orchestrator as a native Linux service,
uses managed MySQL for workflow state, and runs workers in hardened containers.

:::caution
This reference architecture is not a declaration that RunHelm is production
ready. API-key-to-namespace authentication is not implemented, the worker API
does not authenticate workers and a worker container is not a per-task sandbox. The current MySQL
configuration also does not expose settings for TLS mode or custom CA material.
Supply the missing security controls at the network and platform layers, and
validate them against your environment before carrying live workloads.
:::

## Reference topology

<pre class="mermaid">
flowchart LR
    C["Workflow clients"]
    G["TLS and authentication gateway"]

    subgraph CP["Control plane"]
        O["RunHelm orchestrator<br/>native systemd service"]
        M[("Managed MySQL<br/>backups enabled")]
        O --- M
    end

    subgraph EP["Private execution network"]
        WA["Worker container A<br/>persistent workspace and cache"]
        WB["Worker container B<br/>persistent workspace and cache"]
    end

    C -->|"HTTPS"| G
    G -->|"public API :3000"| O
    O <-->|"private worker API :3001"| WA
    O <-->|"private worker API :3001"| WB
</pre>

The gateway is the authentication boundary. It must reject unauthenticated
requests and prevent clients from bypassing it. The orchestrator's worker API
must be reachable only from trusted worker networks.

Run one orchestrator for each deployment partition. Add workers to increase
execution capacity; add independent orchestrator partitions when one control
plane is no longer sufficient. Do not run multiple orchestrators against the
same database as an active-active cluster. See [Scaling](/runhelm/docs/operations/scaling/)
for the supported partitioning model.

## Build the orchestrator artifact

RunHelm does not currently publish standalone orchestrator binaries. Build an
artifact from a pinned release tag on a trusted build machine, then copy only
the binary to the live host. The following uses the production Dockerfile as a
repeatable build environment; Docker is not required on the orchestrator host.

```bash
git clone https://github.com/markosski/runhelm.git
cd runhelm
git checkout v0.3.1

docker build --pull \
  --file orchestrator/Dockerfile \
  --tag runhelm-orchestrator-build:0.3.1 \
  orchestrator

container_id="$(docker create runhelm-orchestrator-build:0.3.1)"
docker cp "$container_id:/usr/local/bin/orchestrator" ./runhelm-orchestrator
docker rm "$container_id"
sha256sum ./runhelm-orchestrator
```

Replace `v0.3.1` with the release being deployed. Record the source tag, image
digest, and binary checksum with the deployment. Transfer
`runhelm-orchestrator` to the live host through your normal artifact channel.

## Install the orchestrator

Create an unprivileged service account and install the binary:

```bash
sudo useradd \
  --system \
  --home-dir /var/lib/runhelm \
  --create-home \
  --shell /usr/sbin/nologin \
  runhelm

sudo install -o root -g root -m 0755 \
  ./runhelm-orchestrator \
  /usr/local/bin/runhelm-orchestrator
sudo install -d -o root -g runhelm -m 0750 /etc/runhelm
```

Create `/etc/runhelm/orchestrator.env`:

```text
RUNHELM_PUBLIC_HTTP_ADDR=127.0.0.1:3000
RUNHELM_WORKER_HTTP_ADDR=10.0.10.5:3001
RUNHELM_USE_GLOBAL_NAMESPACE=true

RUNHELM_STORAGE=mysql
RUNHELM_STORE_MYSQL_HOST=mysql.internal.example
RUNHELM_STORE_MYSQL_PORT=3306
RUNHELM_STORE_MYSQL_DATABASE=runhelm
RUNHELM_STORE_MYSQL_USERNAME=runhelm
RUNHELM_STORE_MYSQL_PASSWORD=replace-with-a-secret

RUNHELM_MAX_CONCURRENT_WORKFLOWS=8
RUNHELM_WORKFLOW_QUEUE_CAPACITY=1024
RUNHELM_TASK_TIMEOUT_SECS=300
RUST_LOG=info
```

Replace `10.0.10.5` with the orchestrator's private address. Keep port `3000`
on loopback when the gateway runs on the same host; otherwise bind it to a
private gateway-facing address and restrict it with a firewall.

The global namespace setting makes public requests usable without RunHelm
authentication. RunHelm ignores an incoming authorization header in this mode,
so the external gateway must authenticate every request before forwarding it.

Protect the environment file because it contains the database password:

```bash
sudo chown root:runhelm /etc/runhelm/orchestrator.env
sudo chmod 0640 /etc/runhelm/orchestrator.env
```

The database must exist before startup. Its user needs permission to apply
RunHelm's schema migrations and to read and write application tables. See
[Orchestrator Storage](/runhelm/docs/operations/storage/) for MySQL version,
migration, and compatibility requirements.

Create `/etc/systemd/system/runhelm-orchestrator.service`:

```ini
[Unit]
Description=RunHelm orchestrator
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=runhelm
Group=runhelm
EnvironmentFile=/etc/runhelm/orchestrator.env
ExecStart=/usr/local/bin/runhelm-orchestrator
Restart=on-failure
RestartSec=5s

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
CapabilityBoundingSet=
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6

[Install]
WantedBy=multi-user.target
```

Load and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now runhelm-orchestrator
sudo systemctl status runhelm-orchestrator
curl -fsS http://127.0.0.1:3000/health
```

Configure the gateway to terminate TLS, authenticate and authorize callers,
apply request limits, and forward accepted requests to port `3000`. Do not
publish port `3001`; permit it only from the worker network. Database traffic
must also use a trusted private path or platform-provided encrypted transport
because RunHelm does not currently expose database TLS configuration.

## Run a worker container

Build or mirror a worker image from the same pinned release as the orchestrator.
Create state directories on each worker host. The container image runs as UID
and GID `10001` by default:

```bash
sudo install -d -o 10001 -g 10001 -m 0750 \
  /srv/runhelm/workspaces \
  /srv/runhelm/cache
sudo install -d -o root -g 10001 -m 0750 \
  /etc/runhelm-worker \
  /opt/runhelm/skills
sudo install -o root -g 10001 -m 0440 \
  ./file_credentials.json \
  /etc/runhelm-worker/file_credentials.json
```

Start one worker on the private execution network:

```bash
docker run --detach \
  --name runhelm-worker-a \
  --restart unless-stopped \
  --user 10001:10001 \
  --read-only \
  --tmpfs /tmp:rw,nosuid,nodev,size=256m \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --pids-limit 256 \
  --memory 2g \
  --cpus 2 \
  --env RUNHELM_ORCHESTRATOR_HTTP_URL=http://10.0.10.5:3001 \
  --env RUNHELM_WORKER_HOST_ID=worker-node-a \
  --env RUNHELM_WORKSPACE_ROOT=/workspaces \
  --volume /etc/runhelm-worker/file_credentials.json:/home/runhelm/.runhelm/file_credentials.json:ro \
  --volume /opt/runhelm/skills:/home/runhelm/.pi/agent/skills:ro \
  --volume /srv/runhelm/workspaces:/workspaces:rw \
  --volume /srv/runhelm/cache:/home/runhelm/.cache:rw \
  registry.example.com/runhelm/runhelm-worker:0.3.1
```

Replace the addresses, resource limits, image name, and pinned version for your
environment. Allow outbound access only to the orchestrator and external
services explicitly required by approved workflows.

The credentials file is read when the worker starts. Rotate it through your
secret delivery system and restart the affected worker. Give each workflow only
the credentials it declares and needs. See
[Credentials](/runhelm/docs/operations/credentials/).

## Worker identity and isolation

`RUNHELM_WORKER_HOST_ID` identifies the state domain that owns workspace and
Agent-session files. Workers may share a host ID only when they can access the
same workspace and cache roots. Workers without shared state need distinct host
IDs. See [Worker Host Pinning](/runhelm/docs/operations/worker-host-pinning/).

The cache mount preserves Agent sessions, and the workspace mount preserves
execution files across worker restarts. These directories are execution state,
not durable artifact storage. Copy results that must outlive a worker to an
external durable system. See [Workspaces](/runhelm/docs/operations/workspaces/).

A long-lived worker container is a reasonable boundary for trusted,
internally-authored workflows. It is not a sandbox between tasks: Function code
and Agent tools running in the same worker can access that container's mounted
files, credentials, and permitted network. Mutually untrusted tenants or
workflows require separate worker security domains or an external per-task
container or microVM sandbox that RunHelm does not currently provide.

## Operations checklist

Before carrying live traffic:

- Verify that the gateway is the only route to port `3000` and authenticates
  every request.
- Verify that port `3001` accepts traffic only from trusted worker networks.
- Send orchestrator, gateway, and worker logs to centralized storage and alert
  on service restarts, failed tasks, stalled workflows, and worker loss.
- Monitor `/health`, MySQL availability and capacity, worker capacity, task
  latency, and workflow backlog.
- Enable automated MySQL backups and perform a restore test before relying on
  them.
- Treat schema compatibility notes as upgrade gates. Stop the partition, back
  up the database, and follow the release-specific migration guidance.
- Rotate database and task credentials through managed secret delivery; restart
  workers after changing their credential files.
- Apply CPU, memory, process, filesystem, and outbound network limits to every
  worker security domain.
- Design side-effecting tasks for at-least-once execution and use external
  idempotency keys. See
  [Reliability and Side Effects](/runhelm/docs/operations/reliability/).
- Load-test workflow concurrency and worker capacity with representative tasks
  before changing `RUNHELM_MAX_CONCURRENT_WORKFLOWS`.
