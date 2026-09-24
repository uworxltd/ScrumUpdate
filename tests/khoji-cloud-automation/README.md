# README #

# how to run tests?
## To run the script Locally set the env variables
JIRA_EMAIL // the account email from which to login in atlassian  
JIRA_PASSWORD // password for above account  
JIRA_ACCOUNT_ID // account id by jira for above account  
KBP_BASIC_AUTH_CREDS // kbp credentials in format username:password  
KBP_URL // url for kbp
SERVER_URL // url for server we are testing  
APP_NAME // name of the instance we need to integrate i.e. your-domain  
KBS_BASIC_AUTH_CREDS // kbs credentials in format username:password — same values as the
KHOJI_BASICAUTHUSERNAME:KHOJI_BASICAUTHUSERPASSWORD pair configured for KBS


```bash
    set JIRA_EMAIL=
    set JIRA_PASSWORD=
    set JIRA_ACCOUNT_ID=
    set KBP_BASIC_AUTH_CREDS=
    set KBP_URL=
    set SERVER_URL=
    set APP_NAME=
    set KBS_BASIC_AUTH_CREDS=
```

```shell
    export JIRA_EMAIL=
    export JIRA_PASSWORD=
    export JIRA_ACCOUNT_ID=
    export KBP_BASIC_AUTH_CREDS=
    export KBP_URL=
    export SERVER_URL=
    export APP_NAME=
    export KBS_BASIC_AUTH_CREDS=
```

## Commands
1. `npm run test-in-ui` for testing in gui, mainly for debugging
2. `npm run test-on-chromium` for testing on chromium based browser
3. `npm run report` for viewing the results

> The `/cloud-automation/reset/sanity-users` endpoint only exists when KBS runs with the `dev`
> profile (`@Profile("dev")` on `CloudAutomation`) — tests must point at a dev instance.

## Pre and post test scripts
these scripts are only ran when running it in non ui mode i.e in jenkins or 2 in commands section. these scripts are located inside the scripts folder, and are responsivle for mainly cleaning incase of failures, and assertion on cleaning if test was run successfully.

## Main test
The main test file is located inside the tests folder and all the other tests that will be added later would be added to this folder. The complete flow test basically first navigates to the desired server and then logins using atlassian, after adding the credentials and logging in it integrates the instance and unlocks all the available features going through complete onboarding. Once all the features are unlocked instance is deleted and then again integrated, which then checks for the navigations and mainly if the application is emitting the events
