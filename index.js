const core = require('@actions/core');
const {exec} = require('child_process');
const os = require('os');
const github = require('@actions/github');
const {Base64} = require("js-base64");
const {promises: fs} = require('fs');

async function createComment(octokit, perc) {
    const issueNumber = github.context.payload.pull_request.number;
    const body = `The power usage is: ${perc}%`;

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

async function compareToOld(octokit, new_data) {
    // exec(`git merge-base --fork-point ${github.context.payload.pull_request.head.ref}`, (err, stdout) => {
    //     if (err != null) {
    //         console.log(`Lookup fork point fail: ${err}`);
    //     }
    //     console.log(stdout);
    // });

    const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
    const basehead = `${github.context.payload.pull_request.base.ref}...${github.context.payload.pull_request.head.ref}`

    const response = await octokit.request(`GET /repos/{owner}/{repo}/compare/{basehead}`, {
        owner: owner,
        repo: repo,
        basehead: basehead,
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })

    console.log(response);
    console.log(response['merge_base_commit']);

    try {
        const old_data = JSON.parse(await fs.readFile('./energy/energy.json', 'utf8'));
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
    const path = '.energy/energy.json';
    const message = "Add power report";
    const branch = "main";
    const object = {
        owner: owner, repo: repo, file_path: path, branch: branch
    };

    let sha = '';
    try {
        sha = await octokit.request('GET /repos/{owner}/{repo}/contents/.energy/energy.json', object).data.sha;
    } catch (error) {
    }

    console.log(sha);

    try {
        const result = await octokit.rest.repos.createOrUpdateFileContents({
            owner: owner,
            repo: repo,
            path: path,
            message: message,
            content: Base64.encode(JSON.stringify(content)),
            sha: sha,
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

    const unitTest = core.getInput('what-to-test');
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

async function run() {
    try {
        const octokit = retrieveOctokit()

        const perc = await measureCpuUsage();
        const data = {
            "cpu": perc
        };

        await commitReport(octokit, data);
        const difference = await compareToOld(octokit, data);

        if (difference != null) {
            await createComment(octokit, difference);
        }
    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
    }
}

run();