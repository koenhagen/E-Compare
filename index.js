const core = require('@actions/core');
const {exec} = require('child_process');
const os = require('os');
const github = require('@actions/github');
const {Base64} = require("js-base64");
const {promises: fs} = require('fs');

async function createComment(octokit, data, difference, pull_request) {
    const issueNumber = pull_request.number;
    let body = `The power usage is: ${data['cpu']}%`;
    if (difference !== null) {
        body += `\n\nThis is ${difference}% more than the base branch.`;
    }

    try {
        const result = await octokit.rest.issues.createComment({
            ...github.context.repo,
            issue_number: issueNumber,
            body: body,
        });

        console.log(`createComment Result: ${result.data}`);
    } catch (error) {
        console.error(error);
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
        if (response.data.base_commit.commit.message === 'Add power report') {
            return response.data.merge_base_commit.parents[0].sha;
        }
        return response.data.merge_base_commit.sha;
    } catch (error) {
        console.error(`Could not find fork point: ${error}`);
        return null;
    }
}

async function getMeasurementsFromRepo(sha) {
    try {
        return JSON.parse(await fs.readFile(`./.energy/${sha}.json`, 'utf8'));
    } catch (error) {
        console.error(`Could not find old measurements: ${error}`);
        return null;
    }
}

async function compareToOld(octokit, new_data, old_data) {
    console.log(`Old data: ${old_data['cpu']}`);
    console.log(`New data: ${new_data['cpu']}`);
    return old_data['cpu'] / new_data['cpu'];
}

async function commitReport(octokit, content) {
    const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
    const path = `.energy/${github.context.payload.head_commit.id}.json`;
    const message = "Add power report";
    const branch = "main";

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

async function measureCpuUsage() {
    const cpus = os.cpus();
    const cpu = cpus[0];
    const start = process.cpuUsage();

    const unitTest = core.getInput('run');
    return new Promise((resolve, reject) => {
        exec(unitTest, (err) => {
            if (err != null) {
                console.log(`Measure CPU Usage fail: ${err}`);
                reject(err);
            }

            const total = Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0);
            const usage = process.cpuUsage(start);
            const currentCPUUsage = (usage.user + usage.system) / 1000;
            const perc = (currentCPUUsage / total) * 100;

            console.log(`CPU Usage (%): ${perc}`);
            resolve(perc);
        });
    });
}

function retrieveOctokit() {
    const github_token = core.getInput('GITHUB_TOKEN');
    if (!github_token) {
        console.error('Error: No GitHub secrets access');
        return core.setFailed('No GitHub secrets access');
    }
    return github.getOctokit(github_token);
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

async function run() {
    try {
        const octokit = retrieveOctokit()

        const perc = await measureCpuUsage();
        const data = {
            "cpu": perc
        };

        await commitReport(octokit, data);

        const pull_request = await getPullRequest(octokit, github.context.sha);
        if (pull_request === null) {
            return;
        }
        const sha = await getForkPoint(pull_request, octokit);
        if (sha === null) {
            return;
        }
        const old_data = await getMeasurementsFromRepo(sha);
        if (old_data === null) {
            await createComment(octokit, data, null, pull_request);
        } else {
            const difference = await compareToOld(octokit, data, old_data);
            await createComment(octokit, data, difference, pull_request);
        }

    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
    }
}

run();