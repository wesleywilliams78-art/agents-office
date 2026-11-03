"""Run one of the Tuesday scripts with the scipy stand-in: python -I win/run.py music.py music.npy"""
import sys, runpy, pathlib
here = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(here)); sys.path.insert(1, str(here.parent))
script = sys.argv[1]; sys.argv = sys.argv[1:]
runpy.run_path(str(here.parent / script), run_name="__main__")
