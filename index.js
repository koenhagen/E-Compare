const core = require('@actions/core');
const {exec} = require('child_process');
// const os = require('os');
// const github = require('@actions/github');
// const {Base64} = require("js-base64");
// const {promises: fs} = require('fs');


async function measureCpuUsage() {
    exec('setup.sh');

    const unitTest = core.getInput('run');
    return new Promise((resolve, reject) => {
        exec(unitTest, (err) => {
            if (err != null) {
                console.log(`Measure CPU Usage fail: ${err}`);
                reject(err);
            }
            exec('cat ./cpu-util.txt | python3.10 xgb.py --tdp 240 --cpu-threads 128 --cpu-cores 64 --cpu-make \'amd\' --release-year 2021 --ram 512 --cpu-freq 2250 --cpu-chips 1 | tee -a ./energy-total.txt > ./energy.txt');
        });
    });
}

async function run() {
    try {
        await measureCpuUsage();

    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
    }
}

run();