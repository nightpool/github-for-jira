
const { Octokit } = require('@octokit/core');
const { createAppAuth } = require('@octokit/auth-app');
const url = require('url');
const {
    paginateRest,
    composePaginateRest,
} = require('@octokit/plugin-paginate-rest');

module.exports = async (req, res, next) => {
    const MyOctokit = Octokit.plugin(paginateRest);
    //Personal Access token should be passed while creating Octokit Instance
    const octokit = new MyOctokit({ auth: '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' });

    //org name should be retrieved from OAuth provider, Hardcoding values now
    try {
        const iterator = octokit.paginate.iterator('GET /orgs/{org}/repos', {
            org: 'atlassian',
            type: 'member',
            per_page: 100,

        });
        //iterate through each response
        for await (const { data: repos } of iterator) {
            for (const repo of repos) {
                console.log('Repo Name  is', repo.full_name);
            }
        }
    } catch (err) {
        console.log(err);
    }
    //Owner Info should be retrieved from OAuth provider
    try {
        const branches = await octokit.request('GET /repos/{owner}/{repo}/branches', {
            owner: 'nsurendran1991',
            repo: 'jira',
        })

        branches.data.forEach(element => {
            console.log(element.name);
        });
    } catch (error) {
        console.log(error);
    }
    const button = document.getElementById('createBranchButton');
    button.addEventListener('click', async function (e) {

        const queryObject = url.parse(req.url, true).query;
        var sha;
        try {
            //hardcoding values as UI page is not created
            const result = await octokit.request('GET /repos/{owner}/{repo}/git/refs/{ref}', {
                owner: 'nsurendran1991',
                repo: 'Sample-Repo',
                ref: '/heads/feature/' + 'NJ-1-First-story',
            })
            sha = result.data.object.sha;
            console.log('sha------' + result.data.object.sha);
        } catch (err) {
            console.log(err);
        }
        try {
            //hardcoding values as UI page is not created
            const result = await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
                owner: 'nsurendran1991',
                repo: 'Sample-Repo',
                ref: 'refs/heads/' + queryObject.issueKey + '-' + 'Second-story',
                sha: sha,
            })
        } catch (err) {
            console.log(err);
        }
    });

};