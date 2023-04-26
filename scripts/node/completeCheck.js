#!/usr/bin/node
main();

async function main() {
	const checkId = process.env.CHECK_ID;
	const githubAction = require('@actions/github');
	const pullRequest = githubAction.context.payload.pull_request;
	const check = require('./check.js');
	let data = check.getExisting(pullRequest, checkId);
	data.status = 'completed';
	data.conclusion = 'success';
	const github = require('./github.js');

	const fs = require('fs');
	const results = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
	let annotations = [];
	let actionRequired = false;
	let summary = {};
	let severities = [new Set(),new Set(),new Set(),new Set(),new Set()];
	const severityHeaders = ['Critical', 'Error', 'Warning', 'Info', 'Hint'];
	let summaryContent = '## Files\n';
	results.forEach( (file) => {
		summaryContent += `### ${file.fileName}\n`;
		file.violations.forEach( (violation) => {
			summaryContent += 'Violation | Rule | Severity | Line\n';
			summaryContent += '--- | --- | --- | ---\n';
			summaryContent += `${violation.message.trim()} | ${violation.ruleName} | ${violation.severity - 1} | ${violation.line}\n`;
			// summaryContent += `* ${violation.ruleName}: ${violation.message.trim()}\n`;

			let a = {
				path: file.fileName.replace(process.env.GITHUB_WORKSPACE + '/', ''),
				annotation_level: (violation.severity <= 2 ? 'failure' : (violation.severity > 3 ? 'notice' : 'warning')),
				start_line: parseInt(violation.line),
				end_line: parseInt(violation.endLine),
				message: `${violation.url}`,
				title: `${violation.ruleName}: ${violation.message.trim()}`
			};
			if(violation.line === violation.endLine) {
				a.start_column = parseInt(violation.column);
				a.end_column = parseInt(violation.endColumn);
			}
			if (violation.severity <= 4) {
				actionRequired = true;
			}
			annotations.push(a);
			if(!summary[violation.ruleName]) {
				summary[violation.ruleName] = {
					count: 0,
					severity: violation.severity,
					ruleName: violation.ruleName
				};
			}
			summary[violation.ruleName].count++;
			severities[violation.severity - 1].add(violation.ruleName);
		});
	});
	let summaryText = '';
	for(let i = 0; i < severities.length; i++) {
		if(severities[i].size > 0) {
			summaryText += `### ${severityHeaders[i]}\n`;
			summaryText += 'Rule Name | Count\n';
			summaryText += '--- | ---\n';
			for(const ruleName of [...severities[i]].sort()) {
				summaryText += `${summary[ruleName].ruleName} | ${summary[ruleName].count}\n`;
			}
		}

	}

	if(actionRequired) {
		data.conclusion = 'action_required';
	}
	data.output = {
		title: 'Salesforce Code Quality',
		summary: summaryText + '\n\n' + summaryContent,
		annotations: annotations
	}
	return await github.annotate(data);
}