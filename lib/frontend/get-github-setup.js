const { jiraDomainOptions } = require('./validations');

module.exports = (req, res) => {
  if (req.session.jiraHost) {
    return res.redirect(`${req.session.jiraHost}/plugins/servlet/upm/marketplace/plugins/com.github.integration.production`);
  }

  return res.render('github-setup.hbs', {
    jiraDomainOptions: jiraDomainOptions(),
    csrfToken: req.csrfToken(),
  });
};
