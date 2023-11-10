const core = require('@actions/core');
const {exec} = require('child_process');
const os = require('os');
const github = require('@actions/github');
const {Base64} = require("js-base64");
const {promises: fs} = require('fs');

async function createComment(octokit, difference, pull_request) {
    const issueNumber = pull_request.number;
    const body = `The power usage is: ${difference}%`;

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

async function compareToOld(octokit, new_data, pull_request) {

    const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
    const basehead = `${pull_request.base.ref}...${pull_request.head.ref}`
    console.log(`repo ${repo}`)
    console.log(`owner ${owner}`)
    console.log(`basehead ${basehead}`)

    const response = await octokit.request(`GET /repos/{owner}/{repo}/compare/{basehead}`, {
        owner: owner,
        repo: repo,
        basehead: basehead,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })

    console.log(response);
    console.log(response.data.merge_base_commit.sha);

    try {
        const old_data = JSON.parse(await fs.readFile(`./energy/${response.data.merge_base_commit.sha}.json`, 'utf8'));
        console.log(`Old data: ${old_data['cpu']}`);
        console.log(`New data: ${new_data['cpu']}`);
        return old_data['cpu'] / new_data['cpu'];
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function commitReport(octokit, content) {
    console.log(`Committing report: ${JSON.stringify(content)}`);
    const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
    // const branch = github.context.payload.pull_request.head.ref;
    console.log('github.context.payload.head_commit.id');
    console.log(github.context.payload.head_commit.id);
    const path = `.energy/${github.context.payload.head_commit.id}.json`;
    const message = "Add power report";
    const branch = "main";

    try {
        const result = await octokit.rest.repos.createOrUpdateFileContents({
            owner: owner,
            repo: repo,
            path: path,
            message: message,
            content: Base64.encode(JSON.stringify(content)),
            branch: branch,
        });

        console.log(`commitReport Result: ${result.data}`);
    } catch (error) {
        console.error(`Error while adding report: ${error}`);
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
        console.log('Error: No GitHub secrets access');
        return core.setFailed('No GitHub secrets access');
    }
    return github.getOctokit(github_token);
}

async function getPullRequest(octokit, sha) {
    const result = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        commit_sha: sha
    });
    return result.data.filter(({state}) => state === 'open')[0];
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
        console.log(`Pull request: ${pull_request}`);
        // If this is not a pull request, then we are done
        if (pull_request !== null) {


            const difference = await compareToOld(octokit, data, pull_request);
            if (difference != null) {
                await createComment(octokit, difference, pull_request);
            }
        }

    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
    }
}

run();