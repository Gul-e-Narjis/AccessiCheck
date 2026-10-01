exports.parseResults = (axeResults) => {
  const critical = [];
  const moderate = [];
  const minor = [];

  axeResults.violations.forEach(violation => {
    const issue = {
      id: violation.id,
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      impact: violation.impact,
      nodes: violation.nodes.map(node => ({
        html: node.html,
        failureSummary: node.failureSummary
      }))
    };

    if (violation.impact === 'critical' || violation.impact === 'serious') {
      critical.push(issue);
    } else if (violation.impact === 'moderate') {
      moderate.push(issue);
    } else {
      minor.push(issue);
    }
  });

  const score = Math.max(0, 100 - (critical.length * 10 + moderate.length * 5 + minor.length * 2));

  return { critical, moderate, minor, score };
};