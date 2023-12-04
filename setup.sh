#!/bin/bash

git clone --depth 1 --single-branch --branch main https://github.com/green-coding-berlin/spec-power-model /tmp/spec-power-model
python3 -m pip install -r /tmp/spec-power-model/requirements.txt

gcc /tmp/spec-power-model/demo-reporter/cpu-utilization.c -o /tmp/demo-reporter
chmod +x /tmp/demo-reporter