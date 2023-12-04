const { execSync } = require('child_process');

var run = function rubn(){
    try {
        // Run AI
        execSync(`cat /tmp/cpu-util.txt | python3.10 /tmp/spec-power-model/xgb.py --silent --tdp ${modelData['TDP']} --cpu-threads ${modelData['CPU_THREADS']} --cpu-cores ${modelData['CPU_CORES']} --cpu-make ${modelData['CPU_MAKE']} --release-year ${modelData['RELEASE_YEAR']} --ram ${modelData['RAM']} --cpu-freq ${modelData['CPU_FREQ']} --cpu-chips ${modelData['CPU_CHIPS']} --vhost-ratio ${modelData['VHOST_RATIO']} > /tmp/energy.txt`);

        // Deactivate virtual environment
        execSync('deactivate');
    } catch (error) {

        process.exit(1);
    }

};

module.exports.run = run;