import { execSync } from 'child_process';
import { Globals } from '../globals';
import { KBPFunctions } from './kbp/kbp';
import { KBSFunctions } from './kbs/kbs';

export default async () => {
    console.log('Running post-test scripts...');

    try {
        // direct functionality here
        await new KBPFunctions().checkIfUserExists(Globals.JIRA_ACCOUNT_ID);
    } catch (err) {
        if (err.cause.status != 200) {
            console.error('Script execution failed:', err.message);
        }
        console.log("user exists after test attempting to delete and then throw error");
        await new KBSFunctions().deleteSanityUser();
        console.error('Script execution failed:', err.message);
        throw new Error('Pipeline failed due to script failure.');
    }

    console.log('post-test scripts completed.');
};
