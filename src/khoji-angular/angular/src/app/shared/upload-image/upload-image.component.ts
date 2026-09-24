/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


import {Component, EventEmitter, Input, OnInit, Output, TemplateRef} from '@angular/core';
import { MessageService } from 'primeng/api';
import { ImageCroppedEvent } from 'ngx-image-cropper';
import { Store } from '@ngrx/store';
import { AppState } from 'app/states/app-states';
import { Subscription } from 'rxjs';
import { selectTranslation } from 'app/states/global-translations.selector';
import { Constants } from 'app/constants';
import { getCanvasDataUrlSize, loadExternalImage } from 'app/shared/helper-functions';
import { OnDestroy } from '@angular/core';

@Component({
  selector: 'khoji-upload-image',
  templateUrl: './upload-image.component.html',
  styleUrls: ['./upload-image.component.css'],
})
export class UploadImageComponent implements OnInit, OnDestroy {
  imageUrl: any;
  image: string;
  showUserImage: boolean = false;
  pattern: string;
  avatarUrlString: string = '';
  avatarUrlBase: string;
  imageChangedEvent: any = '';
  croppedImage: any = '';
  checkForUrl: boolean;
  modalRef;
  imageBlob: string;
  loadedImage: HTMLImageElement = null;

  translation: any;
  subscription = new Subscription();
  constants = Constants;
  maxFileSize = this.constants.MAX_IMAGE_SIZE;

  @Input() inputImage = null;
  @Input() showEmail;
  @Input() userEmail;
  @Output() onImageChanged = new EventEmitter<any>();
  @Output() onImageUrlChanged = new EventEmitter<any>();
  @Output() imageDeleted = new EventEmitter<boolean>();

  constructor(private messageService: MessageService,
     private store: Store<AppState>)
  {
  }

  ngOnInit(): void {
    this.subscription.add(
      this.store.pipe(selectTranslation).subscribe((translation) => {
        this.translation = translation;
      })
    );

    this.pattern = this.constants.IMAGE_REGX_PATTERN;
    if (this.inputImage){
      this.image = this.inputImage;
      this.showUserImage = true;
    }
  }

  //to reset selected image or link
  delete() {
    this.showUserImage = false;
    this.image = 'assets/svg/profile-icon.svg';
    this.avatarUrlString = '';
    this.imageBlob = '';
    this.imageChangedEvent = '';
    this.imageDeleted.emit(true);
    this.emitEventsToParentComponent();
  }

  emitEventsToParentComponent(){
    this.onImageChanged.emit(this.imageBlob);
    this.onImageUrlChanged.emit(this.avatarUrlString);
  }


  //to check if an image URL is valid or not
  avatarUrlCheck(): boolean {
    if (this.avatarUrlString.match(this.pattern)) {
      return true;
    }
    this.toast('Please Enter Valid URL');
    return false;
  }

  captureUrlChange(){
    this.onImageUrlChanged.emit(this.avatarUrlString);
  }

  //toast to show errors
  toast(text: string) {
    this.clearToasts();
    this.messageService.add({
      key: 'message',
      severity: 'error',
      summary: 'Error!',
      detail: text,
      // @ts-ignore
      preventOpenDuplicates: true
    });
  }

  clearToasts() {
    this.messageService.clear();
  }

  //ngx-image cropper methods
  imageCropped(event: ImageCroppedEvent) {
    this.croppedImage = event.base64;

    this.imageUrl = this.croppedImage;
  }

  async openModal(template: TemplateRef<any>, event: any) {
    if (this.checkIfFileTypeIsValid(event) && this.checkFileSizeIsWithinRange(event)) {
        this.imageChangedEvent = event;
        this.showModalForCrop(template);
    }
  }

  checkIfFileTypeIsValid(imageChangedEvent: any) {
    var fileType = imageChangedEvent.target.files[0].type;
    if (fileType == 'image/jpg' || fileType == 'image/jpeg' || fileType == 'image/png') {
      return true;
    } else {
      this.toast(this.translation.imageErrorMessages.invalidFormatError);
      return false;
    }
  }

  /**
   *
   * @param img - an HTML image element
   * @returns dataUrl - an image converted into base 64 format
   */
  getDataURLFromHtmlImg(img: HTMLImageElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);
    const dataurl = canvas.toDataURL();
    canvas.remove();
    return dataurl;
  }

  async onAvtarURLEnter(template: TemplateRef<any>) {
    // this.onImageUrlChanged.emit(this.avatarUrlString);
    if (this.avatarUrlString != '' && this.avatarUrlCheck() && await this.checkIfLinkIsValid()) {
      this.avatarUrlBase = this.getDataURLFromHtmlImg(this.loadedImage);
      if (!(getCanvasDataUrlSize(this.avatarUrlBase) > this.maxFileSize)) {
        if (!this.isFileIsSelected()) {
          this.showModalForCrop(template);
        }
      } else {
        this.toast(this.translation.imageErrorMessages.maximumFileSizeError);
      }
    }
  }

  async checkIfLinkIsValid(): Promise<boolean> {
    var img = await loadExternalImage(this.avatarUrlString);
    if (img) {
      this.loadedImage = img;
      return true;
    }
    this.toast('Invalid or broken URL');
    return false;
  }

  isFileIsSelected(): boolean {
    if (this.imageChangedEvent == '') {
      return false;
    } else {
      return true;
    }
  }

  //Method that shows a modal
  showModalForCrop(template: TemplateRef<any>) {
    // this.modalRef = this.modalService.show(template, {
    //   animated: true,
    //   backdrop: 'static',
    // });
  }

  //Method to check If a selected file is within defined size
  checkFileSizeIsWithinRange(event): boolean {
    if (event.target.files.item(0).size > this.maxFileSize) {
      this.toast(this.translation.imageErrorMessages.maximumFileSizeError);
      return false;
    }
    return true;
  }

  //Method triggered when save button is clicked from crop modal
  saveImageToBlob() {
    this.imageBlob = this.croppedImage;
    this.image = this.croppedImage;
    this.emitEventsToParentComponent();
    this.modalRef?.hide();
    this.showUserImage = true;
  }

  closeModal() {
    this.modalRef?.hide();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
