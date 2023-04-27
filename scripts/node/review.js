const diffFilePath = 'diff.txt';
const issuesPath = 'comments.json';
const dfaIssuesPath = 'dfa-comments.json';

const rejectThreshold = parseInt(process.env.REJECT_THRESHOLD);
const approveThreshold = parseInt(process.env.APPROVE_THRESHOLD);
const absoluteMaxComments = parseInt(process.env.MAX_COMMENTS);
const minSeverityToConsider = parseInt(process.env.SEVERITY_THRESHOLD);

const fs = require('fs');
const PR_MAX_SIZE = 29;

const publicMethods = {
	evaluate: function (comments, approveThreshold, rejectThreshold) {
        console.log(`evaluating decision, approve threshold: ${approveThreshold}, reject threshold: ${rejectThreshold}`);
		let severity = getSeverity(comments, rejectThreshold);

		let review = {
			event: 'COMMENT',
			body: 'Salesforce Code Analyzer did not find any rule violations'
		};
		if (approveThreshold !== undefined && severity.mostSevere > approveThreshold) {
			review.event = 'APPROVE';
			if (severity.commentCount > 0) {
				review.body = `Maximum severity of the ${severity.commentCount} rule violations identified by the Salesforce Code Analyzer was ${severity.mostSevere}.`;
			}
		} else if (
			severity.commentCount > 0 &&
			rejectThreshold !== undefined &&
			severity.mostSevere <= rejectThreshold
		) {
			review.event = 'REQUEST_CHANGES';
			review.body = `At least ${severity.needsRework} of the ${severity.commentCount} rule violations identified by the Salesforce Code Analyzer require rework. Highest severity found was ${severity.mostSevere}. `;
		} else if (severity.commentCount > 0) {
			review.body = `Salesforce Code Analyzer identified ${severity.commentCount} rule violations in your changes with severity as high as ${severity.mostSevere}. `;
		}
		return review;
	},
	findRelevantReviews: function (existingReviews) {
		let relevantReviews = [];
		if (Array.isArray(existingReviews)) {
			for (const review of existingReviews) {
				if (review.user.login == 'github-actions[bot]') {
					relevantReviews.push(review);
					console.log(
						`found relevant review: ${review.id} ${review.state} by ${review.user.login} that said "${review.body}"`
					);
				}
			}
		}
		return relevantReviews;
	},
	async createReview(filename) {
		const ViolationsService = require('./violations.js');
		const issues = ViolationsService.get(filename, 5).comments;
		const comments = require('./comments.js');
		const githubAction = require('@actions/github');
		const pullRequest = githubAction.context.payload.pull_request;
		const review = require('./review.js');
		const prReview = publicMethods.evaluate(issues, approveThreshold, rejectThreshold);

		prReview.repo = pullRequest.base.repo.name;
		prReview.owner = pullRequest.base.repo.owner.login;
		prReview.pullNumber = pullRequest.number;
		prReview.commit_id = pullRequest.head.sha;
		for(let issue of issues) {
			issue.commit_id = pullRequest.head.sha;
		}

		const github = require('./github.js');
		const allReviews = await github.getReviews(prReview);
		const previousReviews = review.findRelevantReviews(allReviews);
		let allExistingComments = new Map();

		if (previousReviews.length > 0) {
			for (const previousReview of previousReviews) {
				prReview.id = previousReview.id;
				const existingCommentsArray = await github.getReviewComments(prReview);
				const existingComments = comments.parseExisting(existingCommentsArray);
				allExistingComments = new Map([...existingComments, ...allExistingComments]);
			}
		} 
		let filteredIssues = comments.filter(issues, allExistingComments);
		console.log(
			`current issues: ${issues.length}, already posted: ${allExistingComments.size}, new ${filteredIssues.length}`
		);
		let hasNewIssues = filteredIssues.length > 0;
		let hasNoCurrentIssues = issues.length === 0;
		let isFirstReview = previousReviews.length === 0;
		let isIssueCountChanged = issues.length !== allExistingComments.size;
		console.log(
			`hasNewIssues: ${hasNewIssues}, hasNoCurrentIssues: ${hasNoCurrentIssues}, isFirstReview: ${isFirstReview}, isIssueCountChanged: ${isIssueCountChanged}`
		);
		if (hasNewIssues || isIssueCountChanged || (hasNoCurrentIssues && isFirstReview)) {
			let sortedComments = comments.sort(filteredIssues, absoluteMaxComments);
			prReview.comments = sortedComments.slice(0, PR_MAX_SIZE);
			sortedComments = sortedComments.slice(PR_MAX_SIZE);
			const reviewId = await github.createReview(prReview);
			prReview.id = reviewId;
			console.log(`Review Id ${prReview.id}`);

			const { execSync } = require('child_process');
			for (const issue of sortedComments) {
				console.log(`post single comment [${issue.body}]`);
				let commentId = await github.addComment(prReview, issue);
				console.log(`Comment id: ${commentId} now waiting 5 seconds..`);
				execSync('sleep 5'); // block process for 5 seconds.
			}
		}
	}
};

function getSeverity(comments, rejectThreshold) {
	let severity = { commentCount: 0, mostSevere: 99, needsRework: 0 };
	comments.forEach((comment) => {
		let commentSeverity = parseInt(comment.severity);
		severity.commentCount++;
		if (commentSeverity < severity.mostSevere) {
			severity.mostSevere = commentSeverity;
		}
		if (rejectThreshold !== undefined && commentSeverity <= rejectThreshold) {
			severity.needsRework++;
		}
		delete comment.severity;
	});
    console.log(`Issues severity ${JSON.stringify(severity)}`);
	return severity;
}

module.exports = publicMethods;