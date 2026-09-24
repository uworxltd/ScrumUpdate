import { Pipe, PipeTransform } from "@angular/core";
import { ProjectIntegrationUser, User } from "app/admin/admin.entities";

@Pipe({
    name : 'userListMapper'
})
export class UserListMapperPipe implements PipeTransform {
    transform(users : User[]): ProjectIntegrationUser[] {
     return users.map( (u) => ({
        name: u?.fullName,
        firstName: u?.fullName,
        lastName: '',
        email: u.email,
        accountId: u?.sourceId,
        locationId: null, // u.member?.location?.locnId,
        userRole: u.member?.role,
        avatarURL: u?.avatarURL,
        userStatus: null
     }));
    }

}
