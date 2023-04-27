const fs = require('fs');

module.exports = {
    get: function(filename, severityThreshold = 5) {
        let violations = new Violations(filename, severityThreshold);
        return violations;
    }
}

class Violations {
    filename = '';
    files = [];
    severityThreshold = 5;
    annotations = [];
    markdown = '';
    conclusion = '';
    constructor(filename, severityThreshold = 5) {
        this.filename = filename;
        this.severityThreshold = severityThreshold;
        this._init();
    }

    _init() {
        let summary = {};
        let severities = [new Set(),new Set(),new Set(),new Set(),new Set()];
        this.files = JSON.parse(fs.readFileSync(this.filename, 'utf-8'));
        let reportContent = '<h2>Files</h2><br />';
        reportContent += '<table><tr><th>Violation</th><th>Rule</th><th>Severity</th><th>Line</th></tr>';
        this.files.forEach( (file) => {
            reportContent += `<tr><th colspan="4">${file.fileName}</th></tr>`;
            file.violations.forEach( (violation) => {
                reportContent += `<tr><td>${violation.message.trim()}</td><td>${violation.ruleName}</td><td>${violation.severity}</td><td>${violation.line}</td></tr>`;
                if(violation.severity <= this.severityThreshold) {
                    /*
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
                    */
                    let a = new Annotation(file, violation)
                    this.annotations.push(a);
                    if(!summary[violation.ruleName]) {
                        summary[violation.ruleName] = {
                            count: 0,
                            severity: violation.severity,
                            ruleName: violation.ruleName
                        };
                    }
                    summary[violation.ruleName].count++;
                    severities[violation.severity - 1].add(violation.ruleName);
                }
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
            this.conclusion = 'failure';
        } else if (severities[1].size > 0) {
            this.conclusion = 'action_required';
        } else if (severities[2].size > 0 || severities[3].size > 0) {
            this.conclusion = 'neutral';
        } else {
            this.conclusion = 'success';
        }
        this.markdown = summaryText + '\n\n' + reportContent;
    }
}

class Annotation {
    path;
    annotation_level;
    start_line;
    end_line;
    start_column;
    end_column;
    message;
    title;
    start_column;
    end_column;
    constructor(file, violation){
        this.path = file.fileName.replace(process.env.GITHUB_WORKSPACE + '/', ''),
        this.annotation_level = (violation.severity <= 1 ? 'failure' : (violation.severity > 2 ? 'notice' : 'warning')),
        this.start_line = parseInt(violation.line),
        this.end_line = parseInt(violation.endLine),
        this.message  = `${violation.message.trim()}\n${violation.url}`,
        this.title = `${violation.category} : ${violation.ruleName}`
        if(violation.line === violation.endLine) {
            this.start_column = parseInt(violation.column);
            this.end_column = parseInt(violation.endColumn);
        }

    }
}