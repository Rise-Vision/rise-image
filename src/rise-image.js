/* eslint-disable no-console */

import { PolymerElement, html } from "@polymer/polymer";
import { version } from "./rise-image-version.js";
import "@polymer/iron-image/iron-image.js";

class RiseImage extends PolymerElement {
  static get template() {
    return html`
      <iron-image id="image"></iron-image>
    `;
  }

  static get properties() {
    return {
      file: {
        type: String,
        value: ""
      },
      url: {
        type: String,
        value: ""
      }
    };
  }

  static get EVENT_START() {
    return "start";
  }

  static get EVENT_IMAGE_STATUS_UPDATED() {
    return "image-status-updated";
  }

  static get EVENT_IMAGE_ERROR() {
    return "image-error";
  }

  static get EVENT_LICENSED() {
    return "licensed";
  }

  static get EVENT_UNLICENSED() {
    return "unlicensed";
  }

  static get STORAGE_PREFIX() {
    return "https://storage.googleapis.com/";
  }

  // Each item of observers array is a method name followed by
  // a comma-separated list of one or more dependencies.
  static get observers() {
    return [
      "_handlePlaceholder(placeholder)"
    ]
  }

  constructor() {
    super();

    this.file = this.getAttribute( "file" );
    this._watchInitiated = false;
  }

  ready() {
    super.ready();

    this._configureImageEventListeners();

    const handleStart = () => this._handleStart();

    this.addEventListener( RiseImage.EVENT_START, handleStart, {
      once: true
    });

    this._sendImageEvent( RiseImage.EVENT_CONFIGURED );
  }

  _configureImageEventListeners() {
    this.$.image.addEventListener( "error-changed", () => {

    });
  }

  _getComponentData() {
    return {
      name: "rise-image",
      id: this.id,
      version: version
    };
  }

  _handlePlaceholder( value ) {
    console.log( "handle placeholder", value, this.$.image.preload );
    this.$.image.preload = typeof value !== "undefined" && value;
  }

  _getStorageData() {
    return {
      configuration: "storage file",
      file_form: this._getStorageFileFormat( this.file ),
      file_path: this.file,
      local_url: this.url
    }
  }

  _getStorageFileFormat( filePath ) {
    return filePath.substr( filePath.lastIndexOf( "." ) + 1 ).toLowerCase();
  }

  _handleStartForPreview() {
    // check license for preview will be implemented in some other epic later

    this.url = RiseImage.STORAGE_PREFIX + this.file;
    this._handleImageStatusUpdated( "CURRENT" );
  }

  _handleStart() {
    if ( RisePlayerConfiguration.isPreview()) {
      return this._handleStartForPreview();
    }

    this._logInfo( RiseImage.EVENT_START );

    RisePlayerConfiguration.Licensing.onStorageLicenseStatusChange( status => {
      if ( status.authorized ) {
        this._logInfo( RiseImage.EVENT_LICENSED );

        if ( !this._watchInitiated ) {
          RisePlayerConfiguration.LocalStorage.watchSingleFile(
            this.file, message => this._handleSingleFileUpdate( message )
          );
          this._watchInitiated = true;
        }
      } else {
        this._logWarning( RiseImage.EVENT_UNLICENSED );
        this._sendImageEvent( RiseImage.EVENT_UNLICENSED );
      }
    });
  }

  _logInfo( event, details = null ) {
    RisePlayerConfiguration.Logger.info( this._getComponentData(), event, details, { storage: this._getStorageData() });
  }

  _logError( event, details = null ) {
    RisePlayerConfiguration.Logger.error( this._getComponentData(), event, details, { storage: this._getStorageData() });
  }

  _logWarning( event, details = null ) {
    RisePlayerConfiguration.Logger.warning( this._getComponentData(), event, details, { storage: this._getStorageData() });
  }

  _handleSingleFileError( message ) {
    const details = { file: this.file, errorMessage: message.errorMessage, errorDetail: message.errorDetail };

    this._logError( RiseImage.EVENT_IMAGE_ERROR, {
      errorMessage: message.errorMessage,
      errorDetail: message.errorDetail
    });

    this._sendImageEvent( RiseImage.EVENT_IMAGE_ERROR, details );
  }

  _handleSingleFileUpdate( message ) {
    if ( !message.status ) {
      return;
    }

    this.url = message.fileUrl || "";

    if ( message.status === "FILE-ERROR" ) {
      this._handleSingleFileError( message );
      return;
    }

    this._handleImageStatusUpdated( message.status );
  }

  _handleImageStatusUpdated( status ) {
    this._logInfo( RiseImage.EVENT_IMAGE_STATUS_UPDATED, { status: status });

    if ( status === "CURRENT" ) {
      this.$.image.src = this.url
    }

    this._sendImageEvent( RiseImage.EVENT_IMAGE_STATUS_UPDATED, {
      file: this.file, url: this.url, status: status
    });
  }

  _sendImageEvent( eventName, detail = {}) {
    const event = new CustomEvent( eventName, {
      bubbles: true, composed: true, detail
    });

    this.dispatchEvent( event );
  }

}

customElements.define( "rise-image", RiseImage );
