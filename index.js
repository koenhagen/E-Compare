const core = require('@actions/core');
const { exec } = require('child_process');
const os = require('os');
const github = require('@actions/github');

try {
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

    const github_token = core.getInput('GITHUB_TOKEN');
    console.log(`github_token ${github_token}`);
    if (github_token === '' || !github_token) { //No GitHub secrets access
        return
    }
    const octokit = github.getOctokit(github_token);
    // const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
    octokit.rest.issues.createComment({
        ...github.context.repo,
        issue_number: github.context.payload.pull_request.number,
        body: 'message'
    }).then(result => console.log(`result ${result}`))

} catch (error) {
    core.setFailed(error.message);
}
