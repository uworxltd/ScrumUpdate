import { Globals } from "../../globals";

export class KBSFunctions {
    async deleteSanityUser() {
        console.log("--------------------------------------------------------------------------------------------------------------------------------");
        console.log("about to delete sanity users");

        
        const apiReq: Response = await fetch(
            `${Globals.SERVER_URL.replace('://', '://kbs.')}/cloud-automation/reset/sanity-users`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(Globals.KBS_BASIC_AUTH_CREDS)}`
                }
            }
        );
        
        if (apiReq.status == 200 || apiReq.status == 206) {
            const responseBody = await apiReq.json();
            if (responseBody[Globals.JIRA_EMAIL] == 'HIBERNATE_OR_CODE_FAILURE') {
                throw new Error('failed to delete the user');
            }
        } else {
            console.error({
                status: apiReq.status,
                statusText: apiReq.statusText,
            })
            throw new Error('Error deleting sanity user');
        }
        
        console.log('Sanity user deleted');
        console.log("--------------------------------------------------------------------------------------------------------------------------------");
    }
}