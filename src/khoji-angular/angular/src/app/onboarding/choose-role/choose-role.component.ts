import { Component } from '@angular/core';
import { OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { TagModule } from "primeng/tag";

export interface Role {
  name: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'khoji-choose-role',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    TagModule
],
  templateUrl: './choose-role.component.html',
  styleUrl: './choose-role.component.scss'
})
export class ChooseRoleComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  selectedRole: Role;

  roles: Role[] = [
    { name: 'Developer', description: 'Track work, manage tasks, and join ceremonies', icon: 'pi pi-code' },
    { name: 'Scrum Master', description: 'Lead ceremonies and track team progress', icon: 'pi pi-users' },
  ];

  ngOnInit(): void {
    // Initialization logic here
  }

  selectRole(role: Role) {
    this.selectedRole = role;
  }

  isRoleSelected(role: Role) {
    return role.name === this.selectedRole?.name;
  }

  continueToConnect() {
    // Implement logic to continue to connect
    console.log('Continue to connect clicked');
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
