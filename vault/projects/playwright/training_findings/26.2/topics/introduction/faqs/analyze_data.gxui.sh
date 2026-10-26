#!/bin/sh
# Replay of topics/introduction/faqs/analyze_data.md against the `faq_server.sh main` Galaxy, from `gxui start --headless`.
set -e
gxui note "leave the home page, then click the Galaxy logo (tooltip Home), not a home icon, to get back"
gxui call get about
gxui url
gxui component masthead.home click
gxui component masthead.home visible
gxui url
