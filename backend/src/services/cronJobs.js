const cron = require("cron");
const https = require("https");

const job = new cron.CronJob("*/14 * * * *", function () {
  const request = https.get(process.env.API_URL, (res) => {
    // Consume response data to free up memory
    res.on('data', () => {});
    
    // Properly close the response
    res.on('end', () => {
      res.destroy();
    });
    
    if (res.statusCode === 200) console.log("GET request sent successfully");
    else console.log("GET request failed", res.statusCode);
  })
  .on("error", (e) => {
    console.error("Error while sending request", e);
  })
  .on("timeout", () => {
    console.error("Health check request timed out");
    request.destroy();
  });
  
  // Set request timeout to 30 seconds to prevent hanging sockets
  request.setTimeout(30000, () => {
    request.destroy();
  });
});

module.exports = job;