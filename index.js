const core = require('@actions/core');
const {exec} = require('child_process');
const os = require('os');
const github = require('@actions/github');
const {Base64} = require("js-base64");

function createComment(octokit, perc) {
    octokit.rest.issues.createComment({
        ...github.context.repo,
        issue_number: github.context.payload.pull_request.number,
        body: `The power usage is: ${perc}%`
    }).then(result => console.log(`result ${result.data}`))
}

async function commitReport(octokit, article) {
    const sha = github.context.sha;
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    console.log(github.context.payload.pull_request);
    console.log(github.context.payload.pull_request.head);
    console.log(github.context.payload.pull_request['head']);
    await octokit.rest.repos.createOrUpdateFileContents({
        owner: owner,
        repo: repo,
        path: ".energy.md",
        message: `Add power report`,
        content: Base64.encode(article),
        sha,
        branch: github.context.payload.pull_request.head
    }).then(result => console.log(`result ${result.data}`))
}

try {
    const cpus = os.cpus();
    const cpu = cpus[0];
    start = process.cpuUsage();

    const unitTest = core.getInput('what-to-test');
    exec(unitTest, async (err) => {
        if (err != null) {
            console.log(`Error ${err}`);
            return err;
        }
        const total = Object.values(cpu.times).reduce(
            (acc, tv) => acc + tv, 0
        );

        const usage = process.cpuUsage();
        const currentCPUUsage = (usage.user + usage.system) / 1000;

        const perc = currentCPUUsage / total * 100;

        console.log(Object.values(cpu.times));
        console.log(`Total: ${total}`);
        console.log(`CPU Usage (%): ${perc}`);

        const github_token = core.getInput('GITHUB_TOKEN');
        if (github_token === '' || !github_token) { //No GitHub secrets access
            console.log(`Error: No GitHub secrets access`);
            return
        }
        const octokit = github.getOctokit(github_token);
        await commitReport(octokit, `CPU Usage (%): ${perc}`)

        createComment(octokit, perc);
    });

} catch (error) {
    core.setFailed(error.message);
}
