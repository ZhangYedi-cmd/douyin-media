"""飞书 API 客户端 — token 管理 + 发卡片 + 更新卡片

（与 xhs-auto-gen/pipeline/feishu-bot/feishu.py 同源，纯飞书 API 封装，零业务耦合）
"""

import json
import time
from pathlib import Path

import requests
import yaml

BASE = "https://open.feishu.cn/open-apis"


def _load_config(path=None):
    if path is None:
        path = Path(__file__).parent / "config.yaml"
    with open(path) as f:
        return yaml.safe_load(f)


class FeishuClient:
    def __init__(self, config_path=None):
        self.cfg = _load_config(config_path)
        self._token = None
        self._expires = 0

    @property
    def token(self):
        if time.time() >= self._expires:
            r = requests.post(f"{BASE}/auth/v3/tenant_access_token/internal/", json={
                "app_id": self.cfg["app_id"],
                "app_secret": self.cfg["app_secret"],
            }).json()
            self._token = r["tenant_access_token"]
            self._expires = time.time() + r.get("expire", 7200) - 60
        return self._token

    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"}

    def send_card(self, chat_id, card):
        return requests.post(
            f"{BASE}/im/v1/messages",
            params={"receive_id_type": "chat_id"},
            headers=self._headers(),
            json={
                "receive_id": chat_id,
                "msg_type": "interactive",
                "content": json.dumps(card, ensure_ascii=False),
            },
        ).json()

    def update_card(self, message_id, card):
        return requests.patch(
            f"{BASE}/im/v1/messages/{message_id}",
            headers=self._headers(),
            json={"content": json.dumps(card, ensure_ascii=False)},
        ).json()

    def send_text(self, chat_id, text):
        return requests.post(
            f"{BASE}/im/v1/messages",
            params={"receive_id_type": "chat_id"},
            headers=self._headers(),
            json={
                "receive_id": chat_id,
                "msg_type": "text",
                "content": json.dumps({"text": text}, ensure_ascii=False),
            },
        ).json()

    def upload_image(self, image_path):
        """上传一张图片为 message 资源，返回 image_key（用于 post/image 消息）"""
        with open(image_path, "rb") as f:
            r = requests.post(
                f"{BASE}/im/v1/images",
                headers=self._headers(),
                files={"image": f},
                data={"image_type": "message"},
            ).json()
        if r.get("code") != 0:
            raise RuntimeError(f"上传图片失败 {image_path}: {r}")
        return r["data"]["image_key"]

    def send_post(self, chat_id, title, content):
        """发富文本(post)消息。content=段落列表，每段是节点列表，
        节点如 {"tag":"text","text":"..."} 或 {"tag":"img","image_key":"..."}"""
        post = {"zh_cn": {"title": title, "content": content}}
        return requests.post(
            f"{BASE}/im/v1/messages",
            params={"receive_id_type": "chat_id"},
            headers=self._headers(),
            json={
                "receive_id": chat_id,
                "msg_type": "post",
                "content": json.dumps(post, ensure_ascii=False),
            },
        ).json()
