# Legacy v1 — frozen archive

`index.html` and `admin.html` are Brick City Mashin' v1: a single-file,
localStorage-backed site. They're kept here as reference and are **not**
part of v2's build, deploy, or CI pipeline — nothing in `apps/` or
`packages/` imports from or depends on this directory.

Don't edit these files. If v1 needs to stay reachable during the v2
rollout, serve them as static files at a separate URL or subdomain — see
`docs/deploy.md` ("Legacy v1"). They need no backend and no build step.
