import { Globals } from "../../globals";

export class PostHogFunctions {
    async checkForUserActivity(userId: number, timeNow: Date, cookiesAccepted: boolean = false) {
        console.log("--------------------------------------------------------------------------------------------------------------------------------");
        console.log("Fetching UserActivity");
        const body = JSON.stringify({
            query: {
                kind: "HogQLQuery",
                query: `
                    select timestamp 
                    from events 
                    where properties.$current_url like '%${Globals.SERVER_URL}%' and properties.$user_id = '${userId}' AND event != '$autocapture' 
                    limit 100
                `
            }
        });

        const apiReq: Response = await fetch(
            `${Globals.POSTHOG_URL}${Globals.POSTHOG_PROJECT_KEY}/query`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Globals.POSTHOG_TOKEN}`
                },
                body
            }
        );

        
        if (apiReq.status != 200) {
            console.error({
                status: apiReq.status,
                statusText: apiReq.statusText,
            })
            throw new Error('Error fetching customer data');
        }

        const res = await apiReq.json();

        const activityAfterTestStarted = res.results.map(r => new Date(r[0])).filter(d => d > timeNow);

        if (cookiesAccepted) {
            if (activityAfterTestStarted.length == 0) {
                throw new Error('No activity found after test started');
            }
        } else {
            if (activityAfterTestStarted.length > 0) {
                throw new Error('Activity found after test started and cookies not accepted');
            }
        }

        console.log(activityAfterTestStarted.length);

        console.log("Step Completed!");
        console.log("--------------------------------------------------------------------------------------------------------------------------------");
    }
}