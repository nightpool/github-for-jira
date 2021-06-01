const logger = require('../../config/logger');

module.exports = async (context, jiraClient, util) => {
  const { issue } = context.payload;
  const linkifiedBody = await util.unfurl(issue.body);

  if (!linkifiedBody) {
    logger.error({ noop: 'no_linkified_body_issue' }, 'Halting futher execution for issue since linkifiedBody is empty');
    return;
  }

  const editedIssue = context.issue({
    body: linkifiedBody,
    id: issue.id,
  });

  try {
    await context.github.issues.update(editedIssue);
  } catch (err) {
    logger.error(`Error updating issue: ${err}`);
  }
};
