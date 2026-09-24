import { Location } from 'app/admin/admin.entities'

export interface UserSignup {
  firstName: string;
  lastName: string;
  password: string;
  email: string;
  image: string;
  url: string;
  userAgreement: boolean;
  privacyPolicy: boolean;
  location: Location;
}
