"""Run pulsar-submit / tool / pulsar-finish from staging images the way a TES task does.

Each scenario runs the executors as `docker run --read-only` containers sharing a
named volume at /pulsar_staging, against a throwaway RabbitMQ, and records exit
codes and the status messages (with their stderr) that reached the broker.

Usage (Pulsar dev venv python, for kombu):
  verify.py NEW_IMAGE OLD_IMAGE

Environment (set by verify.sh): PULSARFIX_AMQP_USER, PULSARFIX_AMQP_PASS,
PULSARFIX_AMQP_PORT, PULSARFIX_GALAXY_PORT, PULSARFIX_REJECT_PORT (fake Galaxy
answering 500 to uploads), PULSARFIX_DOWN_PORT (a fake Galaxy this script stops
before stage-out), PULSARFIX_UPLOAD_DIR, PULSARFIX_FAKE_GALAXY.
Output is redacted: no broker credentials, URL query strings or base64 arguments.
"""
import base64
import json
import os
import re
import subprocess
import sys
import time
import uuid

import kombu

NEW_IMAGE, OLD_IMAGE = sys.argv[1], sys.argv[2]
HOST_IP = "172.17.0.1"
USER = os.environ["PULSARFIX_AMQP_USER"]
PASS = os.environ["PULSARFIX_AMQP_PASS"]
AMQP_PORT = int(os.environ["PULSARFIX_AMQP_PORT"])
GALAXY_PORT = int(os.environ["PULSARFIX_GALAXY_PORT"])
REJECT_PORT = int(os.environ["PULSARFIX_REJECT_PORT"])
DOWN_PORT = int(os.environ["PULSARFIX_DOWN_PORT"])
UPLOAD_DIR = os.environ["PULSARFIX_UPLOAD_DIR"]
FAKE_GALAXY = os.environ["PULSARFIX_FAKE_GALAXY"]
JOB_ID = "42"
INPUT = "/pulsar_staging/42/inputs/dataset_1.dat"
OUTPUT = "/pulsar_staging/42/outputs/dataset_2.dat"
CAT_COMMAND = f"cat '{INPUT}' > '{OUTPUT}'"
DIRECTORY_COMMAND = f"rm -f '{OUTPUT}' && mkdir '{OUTPUT}' && cat '{INPUT}' > '{OUTPUT}/inside.txt'"
UPLOADED = os.path.join(UPLOAD_DIR, "dataset_2.dat")


def redact(text):
    text = text.replace(PASS, "REDACTED")
    text = re.sub(r"amqp://[^@\s]*@", "amqp://REDACTED@", text)
    text = re.sub(r"(https?://[^\s?'\"]*)\?[^\s'\"),]*", r"\1?<query redacted>", text)
    text = re.sub(r"job_key=[^&\s'\"]+", "job_key=REDACTED", text)
    return re.sub(r"[A-Za-z0-9+/=]{80,}", "<base64 redacted>", text)


def b64(obj):
    return base64.b64encode(json.dumps(obj).encode()).decode()


def say(text=""):
    print(redact(text), flush=True)


class Scenario:
    def __init__(self, name, galaxy_port=GALAXY_PORT, command_line=CAT_COMMAND):
        self.name = name
        self.prefix = "pulsarfix_%s" % uuid.uuid4().hex[:8]
        self.volume = "wes-tes-pulsarfix2-%s" % self.prefix
        self.host_amqp_url = f"amqp://{USER}:{PASS}@127.0.0.1:{AMQP_PORT}//"
        container_amqp_url = f"amqp://{USER}:{PASS}@{HOST_IP}:{AMQP_PORT}//"
        # Shaped like Galaxy's PulsarTesJobRunner job: the job key is fake.
        files_endpoint = f"http://{HOST_IP}:{galaxy_port}/api/jobs/{JOB_ID}/files?job_key=not-a-real-key"
        self.app_conf = {
            "staging_directory": "/pulsar_staging",
            "persistence_directory": "/pulsar_staging/persisted_data",
            "message_queue_url": container_amqp_url,
            "amqp_key_prefix": self.prefix,
            "manager": {"type": "coexecution", "monitor": "none"},
        }
        input_path = "/galaxy/files/dataset_1.dat"
        self.launch = {
            "job_id": JOB_ID,
            "setup": True,
            "setup_params": {"job_id": JOB_ID},
            "command_line": command_line,
            "remote_staging": {
                "setup": [{
                    "name": "dataset_1.dat",
                    "type": "input",
                    "action": {
                        "action_type": "remote_transfer",
                        "path": input_path,
                        "source": {"path": input_path},
                        "url": files_endpoint + "&path=" + input_path + "&file_type=input",
                    },
                }],
                "action_mapper": {"default_action": "remote_transfer", "files_endpoint": files_endpoint},
                "client_outputs": {
                    "working_directory": "/galaxy/working",
                    "metadata_directory": None,
                    "output_files": ["/galaxy/working/dataset_2.dat"],
                    "dynamic_outputs": [],
                    "dynamic_file_sources": None,
                },
            },
        }
        self.queue = kombu.Queue(
            "%s_status_update" % self.prefix,
            kombu.Exchange("pulsar", "direct", durable=True),
            routing_key="%s_status_update" % self.prefix,
        )
        with kombu.Connection(self.host_amqp_url) as conn:
            self.queue(conn.default_channel).declare()
        subprocess.run(["docker", "volume", "create", self.volume], check=True, capture_output=True)
        if os.path.exists(UPLOADED):
            os.unlink(UPLOADED)

    def run(self, image, script):
        args = [script]
        if script == "pulsar-submit":
            args.append("--no-wait")
        args += ["--base64", b64(self.launch), "--app_conf_base64", b64(self.app_conf)]
        cmd = ["docker", "run", "--rm", "--read-only", "-v", f"{self.volume}:/pulsar_staging", "-w", "/", image, *args]
        start = time.time()
        proc = subprocess.run(cmd, capture_output=True, text=True)
        elapsed = time.time() - start
        say(f"$ docker run --rm --read-only -v <staging volume>:/pulsar_staging {image} {' '.join(args[:2])} ...")
        say(f"exit code: {proc.returncode} ({elapsed:.1f} s)")
        interesting = [
            line for line in (proc.stdout + proc.stderr).splitlines()
            if re.search(r"ERROR|WARNING|Traceback|Exception|status \[", line)
        ]
        for line in interesting[-8:]:
            say("  | " + line[:300])
        return proc.returncode

    def tool(self, image):
        proc = subprocess.run(
            ["docker", "run", "--rm", "--read-only", "-v", f"{self.volume}:/pulsar_staging", image,
             "sh", "-c", "test -e /pulsar_staging/42/command_line && sh /pulsar_staging/42/command_line"],
            capture_output=True, text=True,
        )
        say(f"tool executor (sh /pulsar_staging/42/command_line): exit code {proc.returncode}")
        return proc.returncode

    def messages(self):
        payloads = []
        with kombu.Connection(self.host_amqp_url) as conn:
            queue = self.queue(conn.default_channel)
            while True:
                message = queue.get(no_ack=True)
                if message is None:
                    break
                payloads.append(message.decode())
        for payload in payloads:
            stderr = (payload.get("stderr") or "").strip()
            say(f"published: status={payload['status']!r} stderr={stderr[:400]!r}")
        if not payloads:
            say("published: nothing")
        return payloads

    def cleanup(self):
        with kombu.Connection(self.host_amqp_url) as conn:
            self.queue(conn.default_channel).delete()
        subprocess.run(["docker", "volume", "rm", self.volume], check=True, capture_output=True)


def header(text):
    say()
    say("## " + text)
    say()


def statuses(payloads):
    return [p["status"] for p in payloads]


def last_stderr(payloads):
    return (payloads[-1].get("stderr") or "") if payloads else ""


def uploaded():
    return open(UPLOADED).read() if os.path.exists(UPLOADED) else None


results = []


def check(name, ok):
    results.append((name, ok))
    say(f"CHECK {'PASS' if ok else 'FAIL'}: {name}")


def full_job(image, scenario, before_finish=None):
    codes = (scenario.run(image, "pulsar-submit"), scenario.tool(image))
    if before_finish:
        before_finish()
    codes += (scenario.run(image, "pulsar-finish"),)
    payloads = scenario.messages()
    say(f"output received by fake Galaxy: {uploaded()!r}")
    return codes, payloads


def galaxy_down_scenario(image):
    """Galaxy is up for stage-in and down for stage-out."""
    galaxy = subprocess.Popen(
        [sys.executable, FAKE_GALAXY, HOST_IP, str(DOWN_PORT), UPLOAD_DIR], stderr=subprocess.DEVNULL
    )
    time.sleep(1)

    def stop_galaxy():
        galaxy.terminate()
        galaxy.wait(10)
        say(f"stopped the fake Galaxy on {HOST_IP}:{DOWN_PORT}")

    s = Scenario("G", galaxy_port=DOWN_PORT)
    try:
        return full_job(image, s, before_finish=stop_galaxy)
    finally:
        if galaxy.poll() is None:
            galaxy.terminate()
        s.cleanup()


header(f"D. Success path (regression), {NEW_IMAGE}")
s = Scenario("D")
codes, payloads = full_job(NEW_IMAGE, s)
check("D: submit, tool and finish exit 0", codes == (0, 0, 0))
check("D: publishes ['running', 'complete']", statuses(payloads) == ["running", "complete"])
check("D: output staged back", uploaded() == "cow file contents\n")
s.cleanup()

header(f"G1. Galaxy down at stage-out, {NEW_IMAGE}")
codes, payloads = galaxy_down_scenario(NEW_IMAGE)
check("G1: pulsar-finish exits non-zero", codes[2] != 0)
check("G1: publishes ['running', 'failed']", statuses(payloads) == ["running", "failed"])
check("G1: failed stderr carries the stage-out error",
      last_stderr(payloads).startswith("Pulsar failed to stage outputs: ") and f"{HOST_IP}:{DOWN_PORT}" in last_stderr(payloads))

header(f"G2. Same, before the fix: {OLD_IMAGE}")
codes, payloads = galaxy_down_scenario(OLD_IMAGE)
check("G2: old image publishes failed with empty stderr (the bug)",
      statuses(payloads) == ["running", "failed"] and last_stderr(payloads).strip() == "")

header(f"H. Fake Galaxy answers 500 to uploads, {NEW_IMAGE}")
s = Scenario("H", galaxy_port=REJECT_PORT)
codes, payloads = full_job(NEW_IMAGE, s)
check("H: pulsar-finish exits non-zero", codes[2] != 0)
check("H: publishes ['running', 'failed']", statuses(payloads) == ["running", "failed"])
check("H: failed stderr carries the stage-out error", last_stderr(payloads).startswith("Pulsar failed to stage outputs: "))
s.cleanup()

header(f"I1. Tool writes a directory where its output file belongs, {NEW_IMAGE}")
s = Scenario("I1", command_line=DIRECTORY_COMMAND)
codes, payloads = full_job(NEW_IMAGE, s)
check("I1: tool exits 0, pulsar-finish exits non-zero", codes[1] == 0 and codes[2] != 0)
check("I1: publishes ['running', 'failed']", statuses(payloads) == ["running", "failed"])
check("I1: failed stderr names the directory",
      last_stderr(payloads) == "Pulsar failed to stage outputs: Output dataset_2.dat is a directory, not a file\n")
check("I1: nothing uploaded", uploaded() is None)
s.cleanup()

header(f"I2. Same, before the fix: {OLD_IMAGE}")
s = Scenario("I2", command_line=DIRECTORY_COMMAND)
codes, payloads = full_job(OLD_IMAGE, s)
check("I2: old image finishes green with nothing staged (the bug)",
      codes == (0, 0, 0) and statuses(payloads) == ["running", "complete"] and uploaded() is None)
s.cleanup()

say()
say("Summary: %d/%d checks passed" % (sum(ok for _, ok in results), len(results)))
sys.exit(0 if all(ok for _, ok in results) else 1)
