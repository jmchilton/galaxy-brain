"""Spike S3: throwaway gxui daemon/client to probe lifecycle. Not the real design - no verb registry.

  gxui_spike.py start SESSION [--idle-timeout S] [--url URL]   spawn detached daemon, wait until ready
  gxui_spike.py call SESSION JSON [--timeout S]                send one request, print the reply
"""

import argparse
import json
import os
import socket
import subprocess
import sys
import time

STATE = os.environ.get("GXUI_HOME", os.path.expanduser("~/.cache/gxui-spike"))


def paths(session):
    base = os.path.join(STATE, session)
    return base + ".sock", base + ".json", base + ".log"


def cleanup(session):
    for path in paths(session)[:2]:
        if os.path.exists(path):
            os.unlink(path)


def request(session, payload, timeout=None):
    sock_path = paths(session)[0]
    client = socket.socket(socket.AF_UNIX)
    client.settimeout(timeout)
    try:
        client.connect(sock_path)
    except (FileNotFoundError, ConnectionRefusedError):
        stale = os.path.exists(sock_path)
        cleanup(session)
        return {"ok": False, "error": f"no gxui daemon for session {session!r}" + (" (removed stale socket)" if stale else "")}
    with client:
        client.sendall(json.dumps(payload).encode() + b"\n")
        data = b""
        while chunk := client.recv(65536):
            data += chunk
    return json.loads(data)


def start(session, idle_timeout, url):
    os.makedirs(STATE, exist_ok=True)
    if request(session, {"op": "status"}).get("ok"):
        return {"ok": True, "result": "already running"}
    log = open(paths(session)[2], "a")
    subprocess.Popen(
        [sys.executable, __file__, "serve", session, "--idle-timeout", str(idle_timeout), "--url", url],
        start_new_session=True,  # survive the agent shell that spawned us
        stdin=subprocess.DEVNULL,
        stdout=log,
        stderr=log,
    )
    deadline = time.time() + 60
    while time.time() < deadline:
        reply = request(session, {"op": "status"}, timeout=5)
        if reply.get("ok"):
            return reply
        time.sleep(0.5)
    return {"ok": False, "error": "daemon did not become ready", "log": paths(session)[2]}


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def serve(session, idle_timeout, url):
    from playwright.sync_api._generated import BrowserType

    from galaxy.selenium.context import GalaxySeleniumContextImpl

    port = free_port()
    launch = BrowserType.launch
    BrowserType.launch = lambda self, **kwds: launch(self, **{**kwds, "args": [f"--remote-debugging-port={port}"]})

    state = {"dialogs": [], "restarts": 0}

    def new_context():
        ctx = GalaxySeleniumContextImpl(
            {"driver": {"backend_type": "playwright", "headless": True}, "local_galaxy_url": url}
        )
        ctx.configured_driver.driver_impl.page.on("dialog", lambda d: state["dialogs"].append(d))
        return ctx

    def browser_alive(ctx):
        page = ctx.configured_driver.driver_impl.page
        return not page.is_closed() and page.context.browser.is_connected()

    ctx = new_context()
    sock_path, meta_path, _ = paths(session)
    server = socket.socket(socket.AF_UNIX)
    server.bind(sock_path)
    server.listen(8)
    server.settimeout(idle_timeout or None)
    with open(meta_path, "w") as f:
        json.dump({"pid": os.getpid(), "cdp": f"http://127.0.0.1:{port}", "url": url}, f)
    print(f"serving {session} pid={os.getpid()} cdp={port}", flush=True)

    def handle(req):
        nonlocal ctx
        op = req.get("op")
        if op == "status":
            return {"pid": os.getpid(), "cdp": f"http://127.0.0.1:{port}", "browser_alive": browser_alive(ctx), "restarts": state["restarts"]}
        if not browser_alive(ctx):
            # Browser died under us: relaunch fresh (state such as login is gone) and say so.
            try:
                ctx.configured_driver.quit()
            except Exception:
                pass
            ctx = new_context()
            state["restarts"] += 1
            raise RuntimeError("browser had died; relaunched a fresh browser - page state and login are lost")
        if op == "sleep":
            time.sleep(req["seconds"])
            return f"slept {req['seconds']}"
        if op == "title":
            return ctx.configured_driver.driver_impl.page.title()
        if op == "call":
            value = getattr(ctx, req["method"])(*req.get("args", []), **req.get("kwargs", {}))
            return repr(value)[:200]
        raise ValueError(f"unknown op {op}")

    try:
        while True:
            try:
                conn, _ = server.accept()
            except socket.timeout:
                print("idle timeout, exiting", flush=True)
                break
            with conn:
                req = json.loads(conn.makefile().readline())
                if req.get("op") == "stop":
                    conn.sendall(json.dumps({"ok": True, "result": "stopping"}).encode())
                    break
                try:
                    reply = {"ok": True, "result": handle(req)}
                except Exception as e:
                    reply = {"ok": False, "error": f"{type(e).__name__}: {e}"}
                try:
                    conn.sendall(json.dumps(reply).encode())
                except (BrokenPipeError, ConnectionResetError):
                    print(f"client gone before reply to {req}", flush=True)
    finally:
        try:
            ctx.configured_driver.quit()
        finally:
            server.close()
            cleanup(session)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["start", "serve", "call"])
    parser.add_argument("session")
    parser.add_argument("payload", nargs="?")
    parser.add_argument("--idle-timeout", type=float, default=3600)
    parser.add_argument("--url", default="https://test.galaxyproject.org")
    parser.add_argument("--timeout", type=float)
    args = parser.parse_args()
    if args.command == "serve":
        serve(args.session, args.idle_timeout, args.url)
    elif args.command == "start":
        print(json.dumps(start(args.session, args.idle_timeout, args.url)))
    else:
        print(json.dumps(request(args.session, json.loads(args.payload), timeout=args.timeout)))
