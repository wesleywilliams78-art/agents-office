# Local video connector (LTX 2.5 on this machine)

Lets the office agents queue a generated video clip that is made **on this computer**, free, with the LTX Desktop models. It is slow (about 6.5 minutes for a 5-second 540p clip on an RTX 5080 with 16 GB), so agents submit a job and check it later; they never wait for it.

## Parts
- `mcp.mjs`: the MCP server the agents talk to (stdio, no dependencies). Tools: `ltx_status`, `ltx_submit_video`, `ltx_job`, `ltx_list_jobs`, `ltx_cancel`. It validates a request, writes a job file, and makes sure the worker is running.
- `worker.mjs`: one background process that owns the GPU. It starts the LTX backend headless on a private port with a random token, runs jobs one at a time, and shuts the backend down after 10 idle minutes. It is started through WMI so it outlives the agent run that asked for it.
- `shared.mjs`: paths, limits and the job store (`data/ltx/jobs/*.json`, gitignored).
- Output: `output/ltx/<job id>.mp4` (gitignored).

## Set up (once)
1. Install LTX Desktop and download the LTX 2.5 model through its setup wizard. Close the app when you are not using it.
2. `claude mcp add ltx-local --scope user -- "C:\Program Files\nodejs\node.exe" "<repo>\connectors\ltx-local\mcp.mjs"`
3. In `office.config.local.json`: `"mcp": { "departments": { "ltx-local": ["marketing"] } }`, then restart the office.
4. Give a desk the tool: add `"ltx-local"` to its `tools` (VIDEO EDITOR has it) and bind the skill `local-video-generation`.

## Guard rails
- Always local: the worker turns off LTX's "use the cloud API for video" preference before every job. Cloud video is billed per second and is never used.
- Refuses to start when LTX Desktop is open (it holds the GPU) or when under 8 GB of RAM is free. Windows ran out of memory below that during testing and the backend crashed.
- At most 4 jobs queued or running; there is no length limit. A video over 10 seconds is made as a chain of parts of up to 10 seconds: each part starts from the last frame of the one before (image-to-video), and ffmpeg joins them. Time scales with length: about 1.3 minutes per second at 540p (measured for 5 s; longer is an estimate), so a minute of video is about 80 minutes. `scenes` gives one prompt per part. A queued or running job can be cancelled (a running one stops after the part in progress). Parts live in `data/ltx/tmp/` until the join. Needs ffmpeg (found on PATH or in the winget packages).
- Needs a large page file: set it to 32 GB initial, 80 GB maximum (or system managed). With the default it crashed.

## Try it by hand
`node connectors/ltx-local/mcp.mjs` speaks JSON-RPC on stdin/stdout. A job's state is in `data/ltx/jobs/<id>.json`; the worker log is `data/ltx/worker.log` and the backend's `data/ltx/backend.log`.

## Known limits
- The model leans photographic. Ask for flat colour, but brand-exact shapes, type and the seal are added afterwards in Canva or HyperFrames.
- Text-to-video only for now. Image-to-video, extend and the local image model (Z-Image-Turbo) are available in the backend and can be added as tools.
- Text encoding uses the free LTX API key saved in LTX Desktop (cloud text step, about 15 seconds). The video itself is local.
