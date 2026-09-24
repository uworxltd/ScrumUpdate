import { User } from "app/admin/admin.entities";

export interface UpdatedUserOnChange {
  userId: string;
  updatedUser: User;
}
