const core = require('@actions/core');
const { exec } = require('child_process');
const os = require('os');

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
        console.log(process.cpuUsage(start));
    });

} catch (error) {
    core.setFailed(error.message);
}
