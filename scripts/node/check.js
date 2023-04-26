module.exports = {
    generate(pullRequest, output = { title: 'Salesforce Code Quality', summary: '', text: '' }) {
        return {
            owner: pullRequest.base.repo.owner.login,
            repo: pullRequest.base.repo.name,
            name: 'Salesforce Code Quality',
            head_sha: pullRequest.head.sha,
            status: 'in_progress',
            output,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
        };
    },
    getExisting(pullRequest, id) {
        return {
            check_run_id: id,
            owner: pullRequest.base.repo.owner.login,
            repo: pullRequest.base.repo.name,
            head_sha: pullRequest.head.sha,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
        };
    }
}