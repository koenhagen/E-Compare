const {retrieveOctokit, createBranch} = require("./functions/GitHub");
const core = require("@actions/core");

export async function run_historic(historic) {
    console.log(`Running E-Compare historic mode with ${historic} commits`);
    const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];

    const octokit = retrieveOctokit();

    const commits = await octokit.rest.repos.listCommits({
        owner: owner,
        repo: repo,
        page: 1,
        per_page: Number(historic) + 1,
    });
    for (let i = 1; i < commits.data.length; i++) {

        const commit = commits.data[i];

        const branch_name = 'energy-' + commit.commit.author.date.substring(0, 19).replaceAll(':', '-').replaceAll('T', '-');

        try {
            // Create a new branch with the commit as the base
            await createBranch(octokit, branch_name, commit.sha);

            // if (result === 'exists') {
            //     continue;
            // }

            // // Create an empty commit
            // const {data: new_commit} = await octokit.rest.git.createCommit({
            //     owner,
            //     repo,
            //     message: 'Empty commit',
            //     tree: commit.commit.tree.sha,  // The tree parameter can be the same as the SHA of the commit
            //     parents: [commit.sha]
            // });

            // // Update the branch reference to point to the new commit
            // await octokit.rest.git.updateRef({
            //     owner,
            //     repo,
            //     ref: `heads/${branch_name}`,
            //     sha: new_commit.sha,
            //     force: true
            // });

        } catch (error) {
            console.error(error);
            core.setFailed(error.message);
            return Promise.reject();
        }

        // try {
        //     //Create pull request
        //     await octokit.rest.pulls.create({
        //         owner,
        //         repo,
        //         title: 'Energy measurement',
        //         head: branch_name,
        //         base: 'main'
        //     });
        // } catch (error) {
        //     console.error(error);
        // }

        // Delete the branch
        // await octokit.rest.git.deleteRef({
        //     owner,
        //     repo,
        //     ref: `heads/${branch_name}`,
        // });
    }
    return Promise.resolve();
}