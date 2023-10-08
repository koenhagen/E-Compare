const core = require('@actions/core');
const { exec } = require('child_process');
const os = require('os');
const github = require('@actions/github');
const { Octokit } = require("@octokit/rest");

try {
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`);

    const octokit = new Octokit();
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
    octokit.issues.createComment({
        ...github.context.repo,
        issue_number: github.context.payload.pull_request.number,
        body: 'message'
    }).then(result => console.log(`result ${result}`))

    // octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/comments', {
    //     owner: owner,
    //     repo: repo,
    //     pull_number: github.context.payload.pull_request.number,
    //     body: 'Great stuff!',
    //     commit_id: github.context.payload.issue.,
    //     path: 'file1.txt',
    //     start_line: 1,
    //     start_side: 'RIGHT',
    //     line: 2,
    //     side: 'RIGHT',
    //     headers: {
    //         'X-GitHub-Api-Version': '2022-11-28'
    //     }
    // }).then(data => {
    //     console.log(data);
    // })

    const cpus = os.cpus();
    const cpu = cpus[0];
    start = process.cpuUsage();

    const unitTest = core.getInput('what-to-test');
    exec(unitTest, (err) => {
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
    });

} catch (error) {
    core.setFailed(error.message);
}
