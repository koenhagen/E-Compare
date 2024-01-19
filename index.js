const core = require('@actions/core');
const github = require("@actions/github");
const fs = require("fs");
const util = require('util');
const os = require("os");
const exec = util.promisify(require('child_process').exec);
const setup = require('./setup');
const AI = require('./functions/AI');
const {
    createComment, getMeasurementsFromRepo, getForkPoint, getPullRequest, commitReport, retrieveOctokit
} = require("./functions/GitHub");
const {run_historic} = require("./historic");
const models = require('./models').models;

async function estimateEnergy() {
    let modelData;
    try {
        const modelName = os.cpus()[0].model;
        const matchingModel = Object.keys(models).find(model => modelName.includes(model));

        if (matchingModel === undefined || matchingModel === null || matchingModel === '') {
            console.error(`No matching model found for ${modelName}`);
            return Promise.reject();
        }
        modelData = models[matchingModel];
    } catch (error) {
        console.error(`Error reading models.json: ${error}`);
        return Promise.reject();
    }
    AI.run(modelData);
    return Promise.resolve();
}

async function measureCpuUsage() {

    const unitTest = core.getInput('run');
    console.log("Testing command: " + unitTest);
    const count = core.getInput('count');
    exec('killall -9 -q demo-reporter || true\n' +
        '/tmp/demo-reporter > /tmp/cpu-util.txt &');
    for (let i = 0; i < count; i++) {
        await exec(unitTest);

    }
    await exec('killall -9 -q demo-reporter');
    await estimateEnergy()

    return Promise.resolve();
}

function readEnergyData() {
    try {
        const energy = fs.readFileSync("/tmp/energy.txt", {encoding: 'utf8', flag: 'r'});
        const energy_numbers = energy.split('\n');

        const count = core.getInput('count');
        let energy_sum = 0;
        for (let i = 0; i < energy_numbers.length; i++) {
            energy_sum += Number(energy_numbers[i]) / count;
        }
        const power_avg = energy_sum / energy_numbers.length;
        const duration = energy_numbers.length / count;
        return {
            "total_energy": energy_sum,
            "power_avg": power_avg,
            "duration": duration
        };
    } catch (error) {
        console.error(`Could not read data: ${error}`);
        return null;
    }
}

async function compareToOld(octokit, new_data, old_data) {
    if (old_data === null) {
        return null;
    }
    console.log(`Old data: ${old_data['total_energy']}`);
    console.log(`New data: ${new_data['total_energy']}`);
    const difference = ((new_data['total_energy'] - old_data['total_energy']) / old_data['total_energy']) * 100;
    return Math.round(difference * 100 + Number.EPSILON) / 100;
}

async function run_pull_request() {
    console.log(`Running E-Compare pull request mode`);
    try {
        const octokit = retrieveOctokit();
        const pull_request = github.context.payload.pull_request;
        const sha = await getForkPoint(pull_request, octokit);
        if (sha === null) {
            return;
        }
        const new_data = await getMeasurementsFromRepo(octokit, pull_request.head.sha);
        if (new_data === null) {
            console.error(`Could not find new measurements`);
            return;
        }
        const old_data = await getMeasurementsFromRepo(octokit, sha);
        if (old_data === null) {
            console.error(`Could not find old measurements`);
            return;
        }
        const difference = await compareToOld(octokit, new_data, old_data);
        await createComment(octokit, new_data, difference, pull_request);

    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
        return Promise.reject();
    }
}

async function run_push() {
    console.log(`Running E-Compare push mode`);
    try {
        setup.run();
        await measureCpuUsage();

        const octokit = retrieveOctokit();
        const new_data = readEnergyData();
        console.log(`Measured data: ${new_data['total_energy']}`);
        await commitReport(octokit, new_data);

        const pull_request = await getPullRequest(octokit, github.context.sha);
        if (pull_request === null) {
            return;
        }
        const sha = await getForkPoint(pull_request, octokit);
        if (sha === null) {
            return;
        }
        const old_data = await getMeasurementsFromRepo(octokit, sha);
        const difference = await compareToOld(octokit, new_data, old_data);
        await createComment(octokit, new_data, difference, pull_request);

        return Promise.resolve();
    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
        return Promise.reject();
    }
}

async function run() {
    const historic = core.getInput('historic');
    if (historic !== undefined && historic !== null && historic !== '') {
        await run_historic(historic);
    }
    if (process.env.GITHUB_EVENT_NAME === 'push') {
        await run_push();
    } else if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
        await run_pull_request();
    }
}

// noinspection JSIgnoredPromiseFromCall
run();