import {Base64} from "js-base64";
const core = require('@actions/core');

const github = require("@actions/github");

export function retrieveOctokit() {
    const github_token = core.getInput('GITHUB_TOKEN');
    if (!github_token) {
        console.error('Error: No GitHub secrets access');
        core.setFailed('No GitHub secrets access');
        throw new Error('No GitHub secrets access'); // Throw an error if the GitHub token couldn't be retrieved
    }
    return github.getOctokit(github_token); // Return the Octokit instance if the operation was successful
}

export async function createBranch(octokit, branch, sha) {
    const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
    try {
        // Check if branch exists
        await octokit.rest.git.getRef({
            owner: owner,
            repo: repo,
            ref: `/heads/${branch}`,
        });
        return 'exists';
    } catch (error) {
        console.log(`Branch ${branch} does not exist. Creating new branch.`);
    }

    try {
        // Create branch
        await octokit.rest.git.createRef({
            owner: owner,
            repo: repo,
            ref: `refs/heads/${branch}`,
            sha: sha,
        });
        return 'success';
    } catch (error) {
        console.error(`Error while creating branch: ${error}`);
        return 'failed';
    }
}

export async function commitReport(octokit, content) {
    const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
    const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
    const path = `.energy/${github.context.payload.head_commit.id}.json`;
    const message = "Add power report";
    await createBranch(octokit, 'energy', github.context.sha);

    // Check if file exists
    let sha = null;
    try {
        const file = await octokit.rest.repos.getContent({
            owner: owner,
            repo: repo,
            path: path,
            ref: 'energy',
        });
        sha = file.data['sha'];
    } catch (error) {
        console.log(`File ${path} does not exist. Creating new file.`);
    }

    try {
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: owner,
            repo: repo,
            path: path,
            message: message,
            content: Base64.encode(JSON.stringify(content)),
            branch: 'energy',
            sha: sha,
        });
    } catch (error) {
        console.error(`Error while creating report: ${error}`);
    }
}

export async function getPullRequest(octokit, sha) {
    try {
        const result = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
            owner: github.context.repo.owner,
            repo: github.context.repo.repo,
            commit_sha: sha
        });
        const pull_request = result.data.filter(({state}) => state === 'open');
        if (pull_request.length === 0) {
            return null;
        }
        return pull_request[0];
    } catch (error) {
        console.error(`No pull request associated with push`);
        return null;
    }
}

export async function getForkPoint(pull_request, octokit) {
    try {
        const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
        const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
        console.log(`base: ${pull_request.base.ref}`);
        console.log(`head: ${pull_request.base}`);
        console.log(`head: ${pull_request}`);
        const basehead = `${pull_request.base.ref}...${pull_request.head.ref}`

        const response = await octokit.request(`GET /repos/{owner}/{repo}/compare/{basehead}`, {
            owner: owner,
            repo: repo,
            basehead: basehead,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        // if (response.data.base_commit.commit.message === 'Add power report') {
        //     return response.data.merge_base_commit.parents[0].sha;
        // }

        // pull_request.head.parents.map((parent) => {
        //     console.log(parent.sha);
        // });
        return response.data.merge_base_commit.sha;
    } catch (error) {
        console.error(`Could not find fork point: ${error}`);
        return null;
    }
}
export async function getMeasurementsFromRepo(octokit, sha) {
    try {
        const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
        const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
        const path = `.energy/${sha}.json`;
        const ref = `energy`;

        const result = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref,
        });
        const content = Buffer.from(result.data['content'], 'base64').toString()
        return JSON.parse(content);
    } catch (error) {
        return null;
    }
}
export async function createComment(octokit, data, difference, pull_request) {
    const issueNumber = pull_request.number;
    let body = `⚡ The total energy is: ${Math.round((data['total_energy'] + Number.EPSILON) * 100) / 100}\n💪 The power is: ${Math.round((data['power_avg'] + Number.EPSILON) * 100) / 100}\n🕒 The duration is: ${data['duration']}`;
    if (difference !== null) {
        if (difference >= -0.5 && difference <= 0.5) {
            body += '\n\nNo significant difference has been found compared to the base branch.';
        } else if (difference > 0.5) {
            body += `\n\n<span style="color:red">${Math.round((difference * 100) + Number.EPSILON)}%</span> lower than the base branch`;
        } else {
            body += `\n\n<span style="color : green">${Math.round((difference * 100) + Number.EPSILON)}%</span> higher than the base branch`;
        }
    }

    try {
        await octokit.rest.issues.createComment({
            ...github.context.repo,
            issue_number: issueNumber,
            body: body,
        });
    } catch (error) {
        console.error(`Could not create comment: ${error}`);
    }
}