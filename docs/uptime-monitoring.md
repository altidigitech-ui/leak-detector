# Uptime Monitoring Setup

## Endpoints to monitor

1. **Frontend** — `https://leakdetector.tech`
   - Check interval: 3 minutes
   - Expected status: 200

2. **Backend Health** — `https://api.leakdetector.tech/health`
   - Check interval: 1 minute
   - Expected status: 200
   - Expected body contains: "healthy"

3. **Backend API** — `https://api.leakdetector.tech/api/v1/analyses`
   - Check interval: 5 minutes
   - Expected status: 401 (no auth = expected)
   - This validates the API is responding

## Setup Steps
1. Create account at https://betteruptime.com
2. Add the 3 monitors above
3. Configure alerts: email to your admin email
4. Optional: Create status page at status.leakdetector.tech
