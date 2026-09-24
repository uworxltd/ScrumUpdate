import { Globals } from "../../globals";

export class KBPFunctions {
    async checkIfUserExists(userId: string, shouldExist: boolean = false) {
        console.log("--------------------------------------------------------------------------------------------------------------------------------");
        console.log("Fetching customers data");
        const apiReq: Response = await fetch(
            `${Globals.KBP_URL}/customer/getTenantDetails`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(Globals.KBP_BASIC_AUTH_CREDS)}`
                }
            }
        );

        if (apiReq.status != 200) {
            console.error({
                status: apiReq.status,
                statusText: apiReq.statusText,
            })
            throw new Error('Error fetching customer data', {
                cause: {
                    status: apiReq.status
                }
            });
        }

        const body = await apiReq.json();

        if (shouldExist) {
            if (body.filter(r => r.customerId == userId).length != 1) {
                throw new Error('Customer does not exist', {
                    cause: {
                        status: 200
                    }
                });
            }        
        } else {
            if (body.filter(r => r.customerId == userId).length > 0) {
                throw new Error('Customer exists', {
                    cause: {
                        status: 200
                    }
                });
            }
        }

        console.log('No anomaly found');
        console.log("--------------------------------------------------------------------------------------------------------------------------------");
    }

    async deleteCustomer(customerId: string) {
        console.log("--------------------------------------------------------------------------------------------------------------------------------");
        console.log("about to delete customer");
        const apiReq: Response = await fetch(
            `${Globals.KBP_URL}/customer/delete/${customerId}`,
            {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(Globals.KBP_BASIC_AUTH_CREDS)}`
                }
            }
        );
        
        if (apiReq.status != 200) {
            console.error({
                status: apiReq.status,
                statusText: apiReq.statusText,
            })
            throw new Error('Error fetching customer data');
        }

        console.log("Customer deleted successfully");
        console.log("--------------------------------------------------------------------------------------------------------------------------------");
    }
}