const core = require('@actions/core');
const github = require("@actions/github");
const {Base64} = require("js-base64");
const fs = require("fs");
const util = require('util');
const os = require("os");
const exec = util.promisify(require('child_process').exec);
const setup = require('./setup');
const AI = require('./AI');
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

function retrieveOctokit() {
    const github_token = core.getInput('GITHUB_TOKEN');
    if (!github_token) {
        console.error('Error: No GitHub secrets access');
        core.setFailed('No GitHub secrets access');
        throw new Error('No GitHub secrets access'); // Throw an error if the GitHub token couldn't be retrieved
    }
    return github.getOctokit(github_token); // Return the Octokit instance if the operation was successful
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

async function createBranch(octokit) {
    const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
    const branch = 'energy';

    try {
        // Check if branch exists
        await octokit.rest.git.getRef({
            owner: owner,
            repo: repo,
            ref: `/heads/${branch}`,
        });
        return branch;
    } catch (error) {
        console.log(`Branch ${branch} does not exist. Creating new branch.`);
    }

    try {
        // Create branch
        await octokit.rest.git.createRef({
            owner: owner,
            repo: repo,
            ref: `refs/heads/${branch}`,
            sha: github.context.sha,
        });
    } catch (error) {
        console.error(`Error while creating branch: ${error}`);
    }
    return branch;
}

async function commitReport(octokit, content) {
    const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
    const path = `.energy/${github.context.payload.head_commit.id}.json`;
    const message = "Add power report";
    const branch = await createBranch(octokit);

    try {
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: owner,
            repo: repo,
            path: path,
            message: message,
            content: Base64.encode(JSON.stringify(content)),
            branch: branch,
        });
    } catch (error) {
        console.error(`Error while creating report: ${error}`);
    }
}

async function getPullRequest(octokit, sha) {
    try {
        const result = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            commit_sha: sha
        });
        const pull_request = result.data.filter(({state}) => state === 'open');
        if (pull_request.length === 0) {
            return null;
        }
        return pull_request[0];
    } catch (error) {
        console.error(`No pull request associated with push`);
        return null;
    }
}

async function getForkPoint(pull_request, octokit) {
    try {
        const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
        const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
        const basehead = `${pull_request.base.ref}...${pull_request.head.ref}`

        const response = await octokit.request(`GET /repos/{owner}/{repo}/compare/{basehead}`, {
            owner: owner,
            repo: repo,
            basehead: basehead,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        // if (response.data.base_commit.commit.message === 'Add power report') {
        //     return response.data.merge_base_commit.parents[0].sha;
        // }

        // pull_request.head.parents.map((parent) => {
        //     console.log(parent.sha);
        // });
        return response.data.merge_base_commit.sha;
    } catch (error) {
        console.error(`Could not find fork point: ${error}`);
        return null;
    }
}

async function getMeasurementsFromRepo(octokit, sha) {
    try {
        const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
        const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
        const path = `.energy/${sha}.json`;
        const ref = `energy`;

        const result = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref,
        });
        const content = Buffer.from(result.data['content'], 'base64').toString()
        return JSON.parse(content);
    } catch (error) {
        return null;
    }
}

async function createComment(octokit, data, difference, pull_request) {
    const issueNumber = pull_request.number;
    let body = `⚡ The total energy is: ${Math.round((data['total_energy'] + Number.EPSILON) * 100) / 100}\n💪 The power is: ${Math.round((data['power_avg'] + Number.EPSILON) * 100) / 100}\n🕒 The duration is: ${data['duration']}`;
    if (difference !== null) {
        if (difference >= -0.5 && difference <= 0.5) {
            body += '\n\nNo significant difference has been found compared to the base branch.';
        } else if (difference > 0.5) {
            body += `\n\n<span style="color:red">${Math.round((difference * 100) + Number.EPSILON)}%</span> lower than the base branch`;
        } else {
            body += `\n\n<span style="color : green">${Math.round((difference * 100) + Number.EPSILON)}%</span> higher than the base branch`;
        }
    }

    try {
        await octokit.rest.issues.createComment({
            ...github.context.repo,
            issue_number: issueNumber,
            body: body,
        });
    } catch (error) {
        console.error(`Could not create comment: ${error}`);
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
    try {
        const octokit = retrieveOctokit();
        const pull_request = github.context.payload.pull_request;
        const sha = await getForkPoint(pull_request, octokit);
        if (sha === null) {
            return;
        }
        const new_data = await getMeasurementsFromRepo(octokit, pull_request.head.sha);
        if (new_data === null) {
            console.error(`Could not find old measurements`);
            return;
        }
        const old_data = await getMeasurementsFromRepo(octokit, sha);
        const difference = await compareToOld(octokit, new_data, old_data);
        await createComment(octokit, new_data, difference, pull_request);

    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
        return Promise.reject();
    }
}

async function run_push() {
    try {
        setup.run();
        await measureCpuUsage();

        const octokit = retrieveOctokit();
        const new_data = readEnergyData();
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

async function run_historic(historic) {
    try {
        const octokit = retrieveOctokit();
        const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
        const repo = process.env.GITHUB_REPOSITORY.split('/')[1];


        const commits = await octokit.rest.repos.listCommits({
            owner: owner,
            repo: repo,
            per_page: historic + 1, // Get one more commit than needed to include the current commit
        });
        console.log(commits.data[0]);
        console.log(commits.data[1]);
        for (let i = 0; i < commits.data[i].sha; i++) {
            const commit = commits.data[i];

            // Check if previous commit exists previous commit
            const result = getMeasurementsFromRepo(octokit, commit.sha);
            if (result !== null) {
                continue;
            }

            // Merge the new branch into the target branch
            await octokit.rest.repos.merge({
                owner: owner,
                repo: repo,
                base: `refs/heads/energy`,
                head: commit.sha,
            });
        }

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
        return;
    }
    if (process.env.GITHUB_EVENT_NAME === 'push') {
        await run_push();
    } else if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
        await run_pull_request();
    }
}

// noinspection JSIgnoredPromiseFromCall
run();