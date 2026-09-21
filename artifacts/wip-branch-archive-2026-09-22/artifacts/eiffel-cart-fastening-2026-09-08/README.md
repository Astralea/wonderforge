# Superseded slow-import attempt

The desktop Blender MCP request on port9876 timed out while appending all
objects from earlier .blend files. OS samples in mcp/ show the import remained
active after the response timed out. Do not re-run or interpret timeout as
completed cancellation. `source-executed.py` preserves the exact initial source.

The corrected, actual MCP build and working viewer are in
`../eiffel-cart-fastening-recovered-2026-09-08/`. That generation used a fresh
background Blender MCP on9877, imported only the named source scenes, and
wrote a single-scene .blend. It never overwrites this delayed attempt's files.

At08:10JST the original desktop process62427 was still CPU-active with no
export in this folder. Its client59822 is terminal with timeout error. Preserve
this evidence and inspect process/output state before deciding recovery.
