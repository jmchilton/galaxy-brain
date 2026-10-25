#!/bin/sh
# Replay of faqs/galaxy/interactive_tools_jupyter_launch.md against the `faq_server.sh main` Galaxy (interactive tools in Docker),
# from `gxui start --headless`.
set -e
N=itj-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui note "Open the Interactive Jupyter Notebook tool"
gxui tool-open interactive_tool_jupyter_notebook
gxui note "Click Run Tool; Executed Notebook appears in the history"
gxui tool-run
gxui note "Open Interactive Tools on the Activity Bar; wait for the instance under Active Interactive Tools"
gxui interactive-tool-wait "Jupyter Interactive Tool"
gxui note "Click the instance to open JupyterLab"
gxui interactive-tool-open "Jupyter Interactive Tool"
gxui interactive-tool-stop "Jupyter Interactive Tool"
