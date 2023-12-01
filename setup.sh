#!/bin/bash

echo "Setup python"

## Create a venv, and backup old
#python3 -m venv /tmp/eco-ci/venv
#
#VENV_VALUE=${VIRTUAL_ENV:-}
#PREVIOUS_VENV=''
#
#if [[ $VENV_VALUE != '' ]]; then
#   PREVIOUS_VENV=$VENV_VALUE
#   source "$(dirname "$0")/vars.sh" add_var PREVIOUS_VENV $PREVIOUS_VENV
#fi
#
##  Installing requirements
## first activate our venv
#source /tmp/eco-ci/venv/bin/activate
#python3 -m pip install -r /tmp/eco-ci/spec-power-model/requirements.txt
## now reset to old venv
#deactivate our venv
## reactivate the old one, if it was present
#if [[ $PREVIOUS_VENV != '' ]]; then
#  source $PREVIOUS_VENV/bin/activate
#fi

git clone --depth 1 --single-branch --branch main https://github.com/green-coding-berlin/spec-power-model /tmp/spec-power-model
python3 -m pip install -r /tmp/spec-power-model/requirements.txt

gcc /tmp/spec-power-model/demo-reporter/cpu-utilization.c -o /tmp/demo-reporter
chmod +x /tmp/demo-reporter