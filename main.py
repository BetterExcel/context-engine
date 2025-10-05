import time
import subprocess

while True:
    subprocess.run(["python3", "vansh-test/run_pipline.sh"])
    time.sleep(300)  # 300 seconds = 5 minutes
