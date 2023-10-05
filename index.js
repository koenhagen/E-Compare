const core = require('@actions/core');
const github = require('@actions/github');

try {
    console.time("energy");
    const { exec } = require('child_process');

    exec('sar -u 1 240 -o test.txt', (err, stdout, stderr) => {
        console.log(err, stdout, stderr)
    });

    // `who-to-greet` input defined in action metadata file
    const nameToGreet = core.getInput('what-to-test');
    console.log(`Hello ${nameToGreet}!`);
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`);

    console.timeEnd("energy");
} catch (error) {
    core.setFailed(error.message);
}
