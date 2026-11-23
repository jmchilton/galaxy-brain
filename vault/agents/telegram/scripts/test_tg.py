import subprocess

import pytest

import tg

JOHN = 111


def update(text: str | None = "status?", sender: int = JOHN) -> dict:
    msg = {"from": {"id": sender, "username": "someone"}, "chat": {"id": sender}}
    if text is not None:
        msg["text"] = text
    return {"update_id": 5, "message": msg}


def test_load_config(tmp_path):
    path = tmp_path / "telegram.env"
    path.write_text("# comment\nTELEGRAM_BOT_TOKEN='abc:123'\nTELEGRAM_ALLOWED_USERS=111, 222\n")
    config = tg.load_config(path)
    assert config["TELEGRAM_BOT_TOKEN"] == "abc:123"
    assert tg.allowed_users(config) == [111, 222]


def test_load_config_requires_token(tmp_path):
    path = tmp_path / "telegram.env"
    path.write_text("TELEGRAM_ALLOWED_USERS=111\n")
    with pytest.raises(SystemExit, match="TELEGRAM_BOT_TOKEN"):
        tg.load_config(path)
    with pytest.raises(SystemExit, match="missing"):
        tg.load_config(tmp_path / "absent.env")


def test_allowed_users_empty():
    assert tg.allowed_users({}) == []


def test_to_prompt_forwards_john():
    assert tg.to_prompt(update("launch the morning review"), [JOHN]) == "[telegram from John] launch the morning review"


def test_to_prompt_drops_unlisted_sender():
    assert tg.to_prompt(update(sender=999), [JOHN]) is None


def test_to_prompt_non_text():
    assert tg.to_prompt(update(text=None), [JOHN]) == "[telegram from John] (sent something other than text; the bridge only forwards text)"


def test_to_prompt_ignores_non_message_updates():
    assert tg.to_prompt({"update_id": 1, "edited_message": {}}, [JOHN]) is None


def test_send_truncates(monkeypatch):
    calls = []
    monkeypatch.setattr(tg, "api", lambda token, method, **params: calls.append((method, params)))
    tg.send("tok", JOHN, "x" * 5000)
    method, params = calls[0]
    assert method == "sendMessage"
    assert params["chat_id"] == JOHN
    assert len(params["text"]) == tg.MAX_TEXT
    assert params["text"].endswith("…")


def test_reply_goes_to_first_allowed_user(monkeypatch):
    monkeypatch.setattr(tg, "load_config", lambda: {"TELEGRAM_BOT_TOKEN": "tok", "TELEGRAM_ALLOWED_USERS": "222,111"})
    sent = []
    monkeypatch.setattr(tg, "send", lambda token, chat, text: sent.append((token, chat, text)))
    tg.reply("Two agents working.")
    assert sent == [("tok", 222, "Two agents working.")]


def test_forward_strips_hc_terminal_id(monkeypatch):
    monkeypatch.setenv("HC_TERMINAL_ID", "t9")
    seen = {}

    def fake_run(args, env, **kwargs):
        seen["args"], seen["env"] = args, env
        return subprocess.CompletedProcess(args, 0, "", "")

    monkeypatch.setattr(tg.subprocess, "run", fake_run)
    assert tg.forward("t3", "[telegram from John] hi") is None
    assert seen["args"] == ["hc", "send", "t3", "[telegram from John] hi"]
    assert "HC_TERMINAL_ID" not in seen["env"]


def test_forward_reports_failure(monkeypatch):
    monkeypatch.setattr(tg.subprocess, "run", lambda args, **kw: subprocess.CompletedProcess(args, 1, "", "no terminal t3\n"))
    assert tg.forward("t3", "hi") == "no terminal t3"
