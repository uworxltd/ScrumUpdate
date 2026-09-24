# Welcome to Microsoft 365 Agents Toolkit!

## Quick Start
1. Press F5, or select Debug > Start Debugging menu in Visual Studio to start your app
</br>![image](https://raw.githubusercontent.com/OfficeDev/TeamsFx/dev/docs/images/visualstudio/debug/debug-button.png)
2. In Microsoft 365 Agents Playground, type and send anything to your bot to get a response


## Run the app on other platforms

The Teams app can run in other platforms like Outlook and Microsoft 365 app. See https://aka.ms/vs-ttk-debug-multi-profiles for more details.

## Get more info

New to Teams app development or Microsoft 365 Agents Toolkit? Explore Teams app manifests, cloud deployment, and much more in the https://aka.ms/teams-toolkit-vs-docs.

## Report an issue

Select Visual Studio > Help > Send Feedback > Report a Problem. 
Or, create an issue directly in our GitHub repository:
https://github.com/OfficeDev/TeamsFx/issues

# Setting up the Bot (Old / PoC Info)

This information is old / from PoC; feel free to replace it with correct one

## Tenant Side

- Create an App Registration using Azure Portal (Tenant) and note down its Application ID and Directory/Tenant ID
- Create a secret and note down its value
- Give Users.Read and TeamsActivity.Send permissions (Delegated)
	- Grant admin consent also

## KhojiGenAIServer

Specify the ClientId (using Application ID), TenantId and ClientSecret in appsettings.json

## M365Agent

Specify botId (using Application ID)
