
const { Octokit } = require("@octokit/core");

const { createAppAuth } = require("@octokit/auth-app");
const url = require('url');

const {
    paginateRest,
    composePaginateRest,
} = require("@octokit/plugin-paginate-rest");
var crypto = require('crypto')

module.exports = async (req, res, next) => {


    const MyOctokit = Octokit.plugin(paginateRest);
    //Personal Access token should be passed while creating Octokit Instance
    const octokit = new MyOctokit({ auth: "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" });

    //org name should be retrieved from OAuth provider, Hardcoding values now
    try {
        const iterator = octokit.paginate.iterator("GET /orgs/{org}/repos", {
            org: "atlassian",
            type: "all",
            per_page: 100,

        });

        // iterate through each response
        for await (const { data: repos } of iterator) {
            for (const repo of repos) {
                console.log("Issue  is ", repo.full_name);
            }
        }
    } catch (err) {
        console.log(err);
    }

    //Owner Info should be retrieved from OAuth provider
    try {
        const branches = await octokit.request('GET /repos/{owner}/{repo}/branches', {
            owner: 'nsurendran1991',
            repo: 'jira'
        })
    } catch (error) {
        console.log(error);
    }

    branches.data.forEach(element => {
        console.log(element.name);
    });


    const button = document.getElementById('createBranchButton');
    button.addEventListener('click', async function (e) {

        var shasum = crypto.createHash('sha1')
        shasum.update('update-contributing')
        var gen_shash = shasum.digest('hex')
        console.log('hash  ' + gen_shash);

        const queryObject = url.parse(req.url, true).query;
        try {
            //hardcoding values as UI page is not created
            const result = await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
                owner: 'octokit',
                repo: 'core',
                ref: 'refs/heads/feature/' + queryObject.issueKey + '-' + queryObject.issueSummary,
                sha: gen_shash
            })
        } catch (err) {
            console.log(err);
        }
    });

};





