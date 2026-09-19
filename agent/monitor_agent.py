import psutil
import requests
import socket
import time
from datetime import datetime, timezone

BACKEND_URL = "http://127.0.0.1:8000/api/metrics"


def collect_metrics():

    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    data = {
        "device_id": socket.gethostname(),
        "hostname": socket.gethostname(),
        "ip_address": socket.gethostbyname(socket.gethostname()),

        "cpu_usage": psutil.cpu_percent(interval=1),

        "ram_usage": memory.percent,
        "ram_total": memory.total,
        "ram_used": memory.used,

        "disk_usage": disk.percent,
        "disk_total": disk.total,
        "disk_used": disk.used,

        "temperature": None,

        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    return data


while True:

    data = collect_metrics()

    print("\nSending metrics:")
    print(data)

    try:
        response = requests.post(
            BACKEND_URL,
            json=data,
            timeout=5
        )

        print("Status:", response.status_code)
        print("Response:", response.json())

    except requests.exceptions.RequestException as e:
        print("Connection error:", e)

    time.sleep(10)