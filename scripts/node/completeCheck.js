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
	let summary = {};
	let severities = [new Set(),new Set(),new Set(),new Set(),new Set()];
	const severityHeaders = ['Critical', 'Error', 'Warning', 'Info', 'Hint'];
	let reportContent = '<h2>Files</h2><br />';
	reportContent += '<table><tr><th>Violation</th><th>Rule</th><th>Severity</th><th>Line</th></tr>';
	results.forEach( (file) => {
		reportContent += `<tr><th colspan="4">${file.fileName}</th></tr>`;
		file.violations.forEach( (violation) => {
			reportContent += `<tr><td>${violation.message.trim()}</td><td>${violation.ruleName}</td><td>${violation.severity}</td><td>${violation.line}</td></tr>`;
			let a = {
				path: file.fileName.replace(process.env.GITHUB_WORKSPACE + '/', ''),
				annotation_level: (violation.severity <= 1 ? 'failure' : (violation.severity > 2 ? 'notice' : 'warning')),
				start_line: parseInt(violation.line),
				end_line: parseInt(violation.endLine),
				message : `${violation.message.trim()}\n${violation.url}`,
				title: `${violation.category} : ${violation.ruleName}`
			};
			if(violation.line === violation.endLine) {
				a.start_column = parseInt(violation.column);
				a.end_column = parseInt(violation.endColumn);
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
	reportContent += '<tr><td><img width="600" height="1" /></td><td><img width="375" height="1" /></td><td><img width="75" height="1" /></td><td><img width="75" height="1" /></td></tr></table>';
	let summaryText = '';
	summaryText += '<table><tr><th>Rule Name</th><th>Severity</th><th>Count</th></tr>';
	for(let i = 0; i < severities.length; i++) {
		if(severities[i].size > 0) {
			for(const ruleName of [...severities[i]].sort()) {
				summaryText += `<tr><td>${summary[ruleName].ruleName}</td><td>${i + 1}</td><td>${summary[ruleName].count}</td></tr>`;
			}
		}
	}
	summaryText += '<tr><td><img width="1000" height="1" /></td><td><img width="75" height="1" /></td><td><img width="75" height="1" /></td></tr></table>'
	if(severities[0].size > 0){
		data.conclusion = 'failure';
	} else if (severities[1].size > 0) {
		data.conclusion = 'action_required';
	} else if (severities[2].size > 0 || severities[3].size > 0) {
		data.conclusion = 'neutral';
	} else {
		data.conclusion = 'success';
	}
	data.output = {
		title: 'Code Quality Report',
		summary: summaryText + '\n\n' + reportContent,
		annotations: annotations
	}
	return await github.annotate(data);
}