# Understanding Min Instances for Cloud Run Services

For applications deployed to Cloud Run (which is what Replit uses), setting minimum instances can prevent cold starts by ensuring at least one instance of your application is always running.

## How Min Instances Work

When configured, the Cloud Run service will maintain at least the specified number of instances, even when there's no traffic. This prevents the "scale to zero" behavior that causes loading delays after periods of inactivity.

## Configuring Min Instances on Replit (Paid Plans)

While Replit's standard deployment doesn't expose Cloud Run's min instances configuration directly, certain paid plans may support always-on functionality:

1. Upgrade to a paid Replit plan that offers "Always On" functionality
2. Enable the "Always On" feature for your Repl
3. This will prevent your application from sleeping when inactive

## Alternative: Using Replit's Autoscale Feature

If you're on Replit's Teams or Teams Pro plan, you might have access to their Autoscale features, which can help manage how your application scales:

1. Navigate to your Repl's settings
2. Look for deployment or scaling settings
3. Configure minimum instances or "always-on" behavior if available

## Other Considerations

- Keeping instances running continuously will use more resources and may affect your Replit usage or billing
- This option is only available on certain paid plans
- For free plans, the uptime monitoring approach (using services like UptimeRobot) is generally recommended

## Learn More

For more information about how Replit handles deployments and scaling, visit the [Replit documentation](https://docs.replit.com/).