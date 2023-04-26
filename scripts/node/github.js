const { Octokit } = require('@octokit/action');

module.exports = {
	createReview: async function (review) {
		const octokit = new Octokit();

		const {
			data: { id }
		} = await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews', {
			owner: review.owner,
			repo: review.repo,
			pull_number: review.pullNumber,
			body: review.body,
			comments: review.comments,
			event: review.event
		});
		return id;
	},

	getReviews: async function (review) {
		const octokit = new Octokit();
		const { data } = await octokit.request(
			'GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews{?per_page,page}',
			{
				owner: review.owner,
				repo: review.repo,
				pull_number: review.pullNumber
			}
		);
		return data;
	},

	getReviewComments: async function (review) {
		const octokit = new Octokit();
		const { data } = await octokit.request(
			'GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments{?per_page,page}',
			{
				owner: review.owner,
				repo: review.repo,
				pull_number: review.pullNumber,
				review_id: review.id
			}
		);
		return data;
	},

	submitReview: async function (review) {
		const octokit = new Octokit();

		await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events', {
			owner: review.owner,
			repo: review.repo,
			pull_number: review.pullNumber,
			review_id: review.id,
			body: review.body,
			event: review.event
		});
	},

	addComment: async function (review, comment) {
		const octokit = new Octokit();

		const {
			data: { id }
		} = await octokit.request('POST /repos/{owner}/{repo}/pulls/{pull_number}/comments', {
			owner: review.owner,
			repo: review.repo,
			pull_number: review.pullNumber,
			body: comment.body,
			path: comment.path,
			position: comment.position,
			commit_id: review.commitId,
			start_side: 'RIGHT',
			side: 'RIGHT'
		});
		return id;
	},

	createCheck: async function (check) {
		const githubAction = require('@actions/github');
		const pullRequest = githubAction.context.payload.pull_request;
	
		const octokit = new Octokit();
		const { 
			data: { id }
		} = await octokit.request('POST /repos/{owner}/{repo}/check-runs', {
			owner: check.owner,
			repo: check.repo,
			name: check.name,
			head_sha: check.sha,
			status: check.status,
			output: check.output,
			headers: {
			  'X-GitHub-Api-Version': '2022-11-28'
			}
		});
		return id;
	},

	annotate: async function (check) {
		const octokit = new Octokit();
		await octokit.request('PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}', {
			owner: 'OWNER',
			repo: 'REPO',
			check_run_id: 'CHECK_RUN_ID',
			name: 'mighty_readme',
			started_at: '2018-05-04T01:14:52Z',
			status: 'completed',
			conclusion: 'success',
			completed_at: '2018-05-04T01:14:52Z',
			output: {
			title: 'Mighty Readme report',
			summary: 'There are 0 failures, 2 warnings, and 1 notices.',
			text: 'You may have some misspelled words on lines 2 and 4. You also may want to add a section in your README about how to install your app.',
			annotations: [
				{
				path: 'README.md',
				annotation_level: 'warning',
				title: 'Spell Checker',
				message: 'Check your spelling for \'banaas\'.',
				raw_details: 'Do you mean \'bananas\' or \'banana\'?',
				start_line: 2,
				end_line: 2
				},
				{
				path: 'README.md',
				annotation_level: 'warning',
				title: 'Spell Checker',
				message: 'Check your spelling for \'aples\'',
				raw_details: 'Do you mean \'apples\' or \'Naples\'',
				start_line: 4,
				end_line: 4
				}
			],
			images: [
				{
				alt: 'Super bananas',
				image_url: 'http://example.com/images/42'
				}
			]
			},
			headers: {
			'X-GitHub-Api-Version': '2022-11-28'
			}
		})
	}
};
