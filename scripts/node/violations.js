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
    summary = {};
    severities = [new Set(),new Set(),new Set(),new Set(),new Set()];
    constructor(filename, severityThreshold = 5) {
        this.filename = filename;
        this.severityThreshold = severityThreshold;
        this.init();
    }

    init() {
        this.files = JSON.parse(fs.readFileSync(this.filename, 'utf-8'));
        let reportContent = '<h2>Files</h2><br />';
        reportContent += '<table>';
        reportContent += this.addRow(['Violation', 'Rule', 'Severity', 'Line'], true);
        this.files.forEach( (file) => {
            reportContent += this.addRow([file.fileName], true, 4);
            file.violations.forEach( (violation) => {
                reportContent += this.addRow([violation.message.trim(), violation.ruleName, violation.severity, violation.line]);
                if(violation.severity <= this.severityThreshold) {
                    let a = new Annotation(file, violation)
                    this.annotations.push(a);
                    this.summarize(violation);
                }
            });
            
        });
        reportContent += this.setColumnWidths([600, 375, 75, 75]);
        reportContent += '</table>';
        let summaryText = '';
        summaryText += '<table><tr><th>Rule Name</th><th>Severity</th><th>Count</th></tr>';
        for(let i = 0; i < this.severities.length; i++) {
            if(this.severities[i].size > 0) {
                for(const ruleName of [...this.severities[i]].sort()) {
                    summaryText += `<tr><td>${this.summary[ruleName].ruleName}</td><td>${i + 1}</td><td>${this.summary[ruleName].count}</td></tr>`;
                }
            }
        }
        summaryText += this.setColumnWidths*([1000, 75, 75]);
        summaryText += '</table>';
        this.updateSeverity();
        this.markdown = summaryText + '\n\n' + reportContent;
    }

    setColumnWidths(cols){
        let response = '<tr>';
        for(let i = 0; i < cols.length; i++) {
            response += `<td><img width="${cols[i]}" height="1" /></td>`;
        }
        response += '</tr>';
        return response;
    }

    addRow(cols, th=false, colspan=1) {
        let response = '<tr>';
        for(let i = 0; i < cols.length; i++) {
            if(th){
                response += `<th colspan="${colspan}">${cols[i]}</th>`;
            } else {
                response += `<td colspan="${colspan}">${cols[i]}</td>`;
            }
        }
        response += '</tr>';
        return response;
    }

    summarize(violation) {
        if(!this.summary[violation.ruleName]) {
            this.summary[violation.ruleName] = {
                count: 0,
                severity: violation.severity,
                ruleName: violation.ruleName
            };
        }
        this.summary[violation.ruleName].count++;
        this.severities[violation.severity - 1].add(violation.ruleName);
    }

    updateSeverity() {
        if(this.severities[0].size > 0){
            this.conclusion = 'failure';
        } else if (this.severities[1].size > 0) {
            this.conclusion = 'action_required';
        } else if (this.severities[2].size > 0 || this.severities[3].size > 0) {
            this.conclusion = 'neutral';
        } else {
            this.conclusion = 'success';
        }
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