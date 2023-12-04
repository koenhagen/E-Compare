const { execSync } = require('child_process');

var setup = function setup(){
    try {
        // Clone the repository
        execSync('git clone --depth 1 --single-branch --branch main https://github.com/green-coding-berlin/spec-power-model /tmp/spec-power-model');

        // Install Python dependencies
        execSync('python3 -m pip install -r /tmp/spec-power-model/requirements.txt');

        // Compile C code
        execSync('gcc /tmp/spec-power-model/demo-reporter/cpu-utilization.c -o /tmp/demo-reporter');

        // Make the compiled binary executable
        execSync('chmod +x /tmp/demo-reporter');

        console.log('Setup completed successfully.');
    } catch (error) {
        console.error(`Setup failed: ${error.message}`);
        process.exit(1);
    }

};

module.exports.run = setup;