"""Parent-owned background Blender MCP instance. Never uses desktop port 9876."""
import importlib.util
import sys
import types
from pathlib import Path

path = Path.home() / 'Library/Application Support/Blender/5.2/extensions/lab_blender_org/mcp/mcp_to_blender_server.py'
package = types.ModuleType('wf_isolated_mcp')
package.__path__ = [str(path.parent)]
sys.modules[package.__name__] = package
spec = importlib.util.spec_from_file_location('wf_isolated_mcp.mcp_to_blender_server', path)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
module.start('127.0.0.1', 9877)
print('WonderForge isolated parent MCP on 9877', flush=True)
while module.is_running():
    module.poll_blocking(0.25)
