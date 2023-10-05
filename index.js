const core = require('@actions/core');
const { exec } = require('child_process');

try {
    start = process.cpuUsage()

    const unitTest = core.getInput('what-to-test');
    exec(unitTest, (err, stdout, stderr) => {
        console.log(unitTest)
        console.log(err, stdout, stderr)
    });
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
    console.log(process.cpuUsage(start))
} catch (error) {
    core.setFailed(error.message);
}
