import { Globals } from '../globals';
import { KBPFunctions } from './kbp/kbp';
import { KBSFunctions } from './kbs/kbs';

export default async () => {
    console.log('Running pre-test scripts...');

    try {
        await new KBPFunctions().checkIfUserExists(Globals.JIRA_ACCOUNT_ID);
    } catch (err) {
        if (err.cause.status != 200) {
            console.error('Script execution failed:', err.message, err.cause.status);   
            throw new Error('Pipeline failed due to script failure.');
        } 
        try {
            console.log("user exists ..... attempting to delete");
            await new KBSFunctions().deleteSanityUser();
        } catch (error) {
            console.error('Script execution failed:', error.message);
            throw new Error('Pipeline failed due to script failure.');
        }
    }

    console.log('Pre-test scripts completed.');
};
