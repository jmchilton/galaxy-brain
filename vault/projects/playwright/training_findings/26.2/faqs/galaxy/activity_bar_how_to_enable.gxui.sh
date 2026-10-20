#!/bin/sh
# Replay of faqs/galaxy/activity_bar_how_to_enable.md against a logged-in gxui session on the
# `faq_server.sh main` Galaxy. 26.2 has no "Manage Activity Bar" preference and the bar can't be
# turned off, so this replays what replaced it: More -> Additional Activities, star/unstar.
set -e
gxui note "steps 1-4 (stale): the Activity Bar is always on in 26.2"
gxui home
gxui component 'activity_bar.item(id=libraries)' visible
gxui note "More at the bottom of the bar opens Additional Activities; unstar Libraries to hide it"
gxui component activity_bar.more click
gxui component 'activity_bar.settings.hide(title=Libraries)' click
gxui component 'activity_bar.item(id=libraries)' absent
gxui screenshot activity-bar-libraries-hidden
gxui note "the choice survives a reload"
gxui home
gxui component 'activity_bar.item(id=libraries)' absent
gxui note "star Libraries to show it again"
gxui component activity_bar.more click
gxui component 'activity_bar.settings.show(title=Libraries)' click
gxui component 'activity_bar.item(id=libraries)' visible
