# Setting Up Uptime Monitoring to Prevent Site Sleep

This guide will help you set up a free uptime monitoring service to keep your Replit deployment awake.

## Option 1: UptimeRobot (Recommended)

UptimeRobot is a free service that can monitor your website every 5 minutes.

1. Visit [UptimeRobot.com](https://uptimerobot.com/) and create a free account
2. After signing in, click on "Add New Monitor"
3. Select "HTTP(s)" as the monitor type
4. Enter a friendly name like "SmartWater Pools App"
5. Enter your Replit URL: `https://smartwaterpools.replit.app`
6. Set the monitoring interval to 5 minutes
7. Click "Create Monitor"

UptimeRobot will now ping your site every 5 minutes, which should be enough to prevent it from sleeping.

## Option 2: Pingdom

Pingdom offers a more advanced monitoring service with a free trial.

1. Visit [Pingdom.com](https://www.pingdom.com/) and sign up
2. Create a new uptime check
3. Enter your Replit URL
4. Set the check interval to 1 minute (on paid plans)
5. Save the configuration

## Option 3: Cron-job.org

Cron-job.org is another free service specifically designed for scheduling regular HTTP requests.

1. Visit [Cron-job.org](https://cron-job.org/en/) and create an account
2. Create a new cronjob
3. Enter your Replit URL
4. Set the execution schedule to run every 5 minutes
5. Save the job

## Option 4: GitHub Actions

If you have your code in a GitHub repository, you can set up a GitHub Action to ping your site regularly:

1. In your GitHub repository, create a file at `.github/workflows/keep-alive.yml`
2. Add the following content:

```yaml
name: Keep Application Alive

on:
  schedule:
    - cron: '*/5 * * * *'  # Run every 5 minutes

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Send HTTP request
        run: |
          curl -sS https://smartwaterpools.replit.app > /dev/null
```

3. Commit the file to your repository

## Notes

- Most free tiers of these services will ping your site every 5 minutes, which is suitable for most applications
- If your application requires more frequent pings, you may need to upgrade to a paid plan
- Remember that keeping your application always warm will consume more resources in your Replit deployment