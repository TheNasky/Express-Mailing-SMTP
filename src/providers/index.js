const config = require("../config");
const SMTPProvider = require("./smtpProvider");
const ResendProvider = require("./resendProvider");

function createProviders() {
  const providers = [];

  if (config.providers.resend.apiKey && config.providers.resend.from) {
    const resend = new ResendProvider(config.providers.resend);
    providers.push(resend);
  }

  if (config.providers.smtp.host && config.providers.smtp.username && config.providers.smtp.password) {
    const smtp = new SMTPProvider(config.providers.smtp);
    providers.push(smtp);
  }

  return providers;
}

module.exports = createProviders;
