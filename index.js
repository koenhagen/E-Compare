const core = require('@actions/core');
const github = require('@actions/github');

try {
    console.time("dbsave");

    // `who-to-greet` input defined in action metadata file
    const nameToGreet = core.getInput('what-to-test');
    console.log(`Hello ${nameToGreet}!`);
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`);

    console.timeEnd("dbsave");
} catch (error) {
    core.setFailed(error.message);
}
