const core = require('@actions/core');

try {
    console.time("energy");
    const { exec } = require('child_process');

    exec('sar -u 1 5 -o test.txt', (err, stdout, stderr) => {
        console.log(err, stdout, stderr)
    });

    const unitTest = core.getInput('what-to-test');
    exec(unitTest, (err, stdout, stderr) => {
        console.log(unitTest)
        console.log(err, stdout, stderr)
    });
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);

    console.timeEnd("energy");
} catch (error) {
    core.setFailed(error.message);
}
